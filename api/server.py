"""Summer Vibe Hack — submissions API + skill install page.

Run:  pip install -r requirements.txt && uvicorn server:app --host 0.0.0.0 --port 3000 --proxy-headers
Data: SQLite file `submissions.db` next to this script.
Auth: pre-generated 6-digit team codes (see generate_codes.py). One code = one
      team = one submission; the same code authorizes later edits.
"""

import base64
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

import qrcode
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

DB_PATH = Path(__file__).parent / "submissions.db"
SKILL_PATH = Path(__file__).resolve().parent.parent / "skill" / "summer-vibe" / "SKILL.md"
INDEX_PATH = Path(__file__).resolve().parent.parent / "index.html"
WALL_DIST = Path(__file__).resolve().parent.parent / "wall" / "dist"
UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
MAX_PHOTOS = 3
MAX_PHOTO_BYTES = 8 * 1024 * 1024
PHOTO_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
CODE_RE = re.compile(r"^\d{6}$")

# voting is built but not open yet — flip with SUMMER_VIBE_VOTING=1 (and rebuild
# the wall with VITE_VOTING=1) when it's time
VOTING_ENABLED = os.environ.get("SUMMER_VIBE_VOTING", "0") == "1"

app = FastAPI(title="Summer Vibe Hack API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def ensure_columns(conn: sqlite3.Connection, table: str, columns: dict) -> None:
    """Add any missing columns to an existing table (idempotent migration)."""
    have = {r["name"] for r in conn.execute(f"PRAGMA table_info({table})")}
    for name, decl in columns.items():
        if name not in have:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {decl}")


with db() as conn:
    conn.execute("CREATE TABLE IF NOT EXISTS codes (code TEXT PRIMARY KEY)")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE REFERENCES codes(code),
            project_name TEXT NOT NULL,
            description TEXT NOT NULL,
            emojis TEXT,
            image_url TEXT,
            demo_url TEXT,
            video_url TEXT,
            github_url TEXT,
            deck_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            twitter TEXT,
            linkedin TEXT,
            github TEXT
        )
    """)
    conn.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)")
    # one vote per team: the voter's code is the primary key, so a team can hold
    # exactly one vote at a time (re-voting replaces it).
    conn.execute("""
        CREATE TABLE IF NOT EXISTS votes (
            voter_code TEXT PRIMARY KEY REFERENCES codes(code),
            submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL
        )
    """)
    # up to MAX_PHOTOS uploaded photos per project, stored on disk in uploads/
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submission_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
            filename TEXT NOT NULL
        )
    """)
    # migrate older databases that predate these columns
    ensure_columns(conn, "submissions", {
        "emojis": "TEXT", "image_url": "TEXT", "video_url": "TEXT",
        "github_url": "TEXT", "deck_url": "TEXT",
    })
    ensure_columns(conn, "members", {"github": "TEXT"})


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def public(conn: sqlite3.Connection, row: sqlite3.Row) -> dict:
    d = dict(row)
    d.pop("code", None)
    d["members"] = [
        {
            "name": m["name"],
            "twitter": m["twitter"],
            "linkedin": m["linkedin"],
            "github": m["github"],
        }
        for m in conn.execute(
            "SELECT * FROM members WHERE submission_id = ? ORDER BY id", (row["id"],)
        )
    ]
    d["votes"] = conn.execute(
        "SELECT COUNT(*) FROM votes WHERE submission_id = ?", (row["id"],)
    ).fetchone()[0]
    d["photos"] = [
        f"/uploads/{p['filename']}"
        for p in conn.execute(
            "SELECT filename FROM submission_photos WHERE submission_id = ? ORDER BY id",
            (row["id"],),
        )
    ]
    return d


def require_code(conn: sqlite3.Connection, code: str) -> None:
    if not CODE_RE.match(code or ""):
        raise HTTPException(status_code=401, detail="code must be 6 digits")
    if conn.execute("SELECT 1 FROM codes WHERE code = ?", (code,)).fetchone() is None:
        raise HTTPException(status_code=401, detail="unknown code")


# --- signed edit links -----------------------------------------------------
# A team can mint a signed link so a teammate edits the page without the code.
# The token is an HMAC of {submission id, expiry}; nothing secret is in the url.
SHARE_TTL_DAYS = 30


def signing_secret(conn: sqlite3.Connection) -> bytes:
    """Server secret for signing links. Env wins; otherwise generate + persist."""
    env = os.environ.get("SUMMER_VIBE_SECRET")
    if env:
        return env.encode()
    row = conn.execute(
        "SELECT value FROM settings WHERE key = 'signing_secret'"
    ).fetchone()
    if row:
        return row["value"].encode()
    val = secrets.token_hex(32)
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('signing_secret', ?)", (val,)
    )
    return val.encode()


def _b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def _b64u_dec(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def sign_token(conn: sqlite3.Connection, sub_id: int) -> str:
    payload = _b64u(
        json.dumps(
            {"sid": sub_id, "exp": int(time.time()) + SHARE_TTL_DAYS * 86400}
        ).encode()
    )
    sig = _b64u(hmac.new(signing_secret(conn), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def verify_token(conn: sqlite3.Connection, token: str) -> int | None:
    """Return the submission id a token authorizes, or None if bad/expired."""
    try:
        payload, sig = token.split(".", 1)
        expected = _b64u(
            hmac.new(signing_secret(conn), payload.encode(), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(_b64u_dec(payload))
        if int(data.get("exp", 0)) < time.time():
            return None
        return int(data["sid"])
    except Exception:
        return None


def authorize_edit(
    conn: sqlite3.Connection, code: str | None, token: str | None
) -> sqlite3.Row:
    """Resolve the submission an editor may change — by signed link or by code."""
    if token:
        sub_id = verify_token(conn, token)
        if sub_id is None:
            raise HTTPException(status_code=401, detail="this edit link is invalid or expired")
        row = conn.execute(
            "SELECT * FROM submissions WHERE id = ?", (sub_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="this project no longer exists")
        return row
    require_code(conn, code)
    row = conn.execute(
        "SELECT * FROM submissions WHERE code = ?", (code,)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="no submission for this code yet")
    return row


def replace_members(conn: sqlite3.Connection, submission_id: int, members: list) -> None:
    conn.execute("DELETE FROM members WHERE submission_id = ?", (submission_id,))
    for m in members:
        conn.execute(
            "INSERT INTO members (submission_id, name, twitter, linkedin, github)"
            " VALUES (?, ?, ?, ?, ?)",
            (submission_id, m.name, m.twitter, m.linkedin, m.github),
        )


# the optional-link fields a submission carries, in one place so create/update stay in sync
LINK_FIELDS = ("emojis", "image_url", "demo_url", "video_url", "github_url", "deck_url")


class Member(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    twitter: str | None = Field(default=None, max_length=300)
    linkedin: str | None = Field(default=None, max_length=300)
    github: str | None = Field(default=None, max_length=300)


class Submission(BaseModel):
    code: str
    project_name: str = Field(min_length=1, max_length=200)
    # minimal sign-up is just code + name; everything else fills in later
    description: str = Field(default="", max_length=5000)
    emojis: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=1000)
    demo_url: str | None = Field(default=None, max_length=1000)
    video_url: str | None = Field(default=None, max_length=1000)
    github_url: str | None = Field(default=None, max_length=1000)
    deck_url: str | None = Field(default=None, max_length=1000)
    members: list[Member] = Field(default_factory=list, max_length=20)


class SubmissionUpdate(BaseModel):
    code: str | None = None  # a code OR a signed token authorizes the edit
    token: str | None = None
    project_name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    emojis: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=1000)
    demo_url: str | None = Field(default=None, max_length=1000)
    video_url: str | None = Field(default=None, max_length=1000)
    github_url: str | None = Field(default=None, max_length=1000)
    deck_url: str | None = Field(default=None, max_length=1000)
    members: list[Member] | None = Field(default=None, max_length=20)


class Lookup(BaseModel):
    code: str


class Vote(BaseModel):
    code: str
    submission_id: int


class ShareRequest(BaseModel):
    code: str | None = None
    token: str | None = None


class TokenRequest(BaseModel):
    token: str


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/submissions", status_code=201)
def create_submission(sub: Submission, request: Request):
    with db() as conn:
        require_code(conn, sub.code)
        exists = conn.execute(
            "SELECT id FROM submissions WHERE code = ?", (sub.code,)
        ).fetchone()
        if exists:
            raise HTTPException(
                status_code=409,
                detail="this code already has a submission — use PUT /submissions to edit it",
            )
        ts = now()
        cols = ["code", "project_name", "description", *LINK_FIELDS, "created_at", "updated_at"]
        vals = [
            sub.code, sub.project_name, sub.description,
            *(getattr(sub, f) for f in LINK_FIELDS), ts, ts,
        ]
        cur = conn.execute(
            f"INSERT INTO submissions ({', '.join(cols)})"
            f" VALUES ({', '.join('?' * len(cols))})",
            vals,
        )
        replace_members(conn, cur.lastrowid, sub.members)
        # hand the team their code and a direct link to their page, so they can
        # save both: the code re-opens the entry for edits, the url shows it off.
        return {
            "id": cur.lastrowid,
            "status": "saved",
            "code": sub.code,
            "url": page_url(request, cur.lastrowid),
        }


@app.put("/submissions")
def update_submission(upd: SubmissionUpdate, request: Request):
    with db() as conn:
        row = authorize_edit(conn, upd.code, upd.token)
        fields = {}
        if upd.project_name is not None:
            fields["project_name"] = upd.project_name
        if upd.description is not None:
            fields["description"] = upd.description
        for f in LINK_FIELDS:
            v = getattr(upd, f)
            if v is not None:
                fields[f] = v
        if not fields and upd.members is None:
            raise HTTPException(status_code=400, detail="nothing to update")
        if fields:
            sets = ", ".join(f"{k} = ?" for k in fields)
            conn.execute(
                f"UPDATE submissions SET {sets}, updated_at = ? WHERE id = ?",
                (*fields.values(), now(), row["id"]),
            )
        else:
            conn.execute(
                "UPDATE submissions SET updated_at = ? WHERE id = ?", (now(), row["id"])
            )
        if upd.members is not None:
            replace_members(conn, row["id"], upd.members)
        row = conn.execute(
            "SELECT * FROM submissions WHERE id = ?", (row["id"],)
        ).fetchone()
        return {
            "status": "updated",
            "submission": public(conn, row),
            "url": page_url(request, row["id"]),
        }


@app.post("/submissions/lookup")
@app.post("/lookup")  # legacy path — the on.ascii.dev gateway shadows /lookup, use /submissions/lookup
def lookup(body: Lookup, request: Request):
    """For the leaderboard edit flow: is this code valid, and what did it submit?"""
    with db() as conn:
        require_code(conn, body.code)
        row = conn.execute(
            "SELECT * FROM submissions WHERE code = ?", (body.code,)
        ).fetchone()
        vote = conn.execute(
            "SELECT submission_id FROM votes WHERE voter_code = ?", (body.code,)
        ).fetchone()
        return {
            "valid": True,
            "submission": public(conn, row) if row else None,
            "url": page_url(request, row["id"]) if row else None,
            "voted_for": vote["submission_id"] if vote else None,
        }


@app.post("/submissions/photos")
async def upload_photos(
    code: str | None = Form(None),
    token: str | None = Form(None),
    photos: list[UploadFile] = File(...),
):
    """Add photos to the team's project (appends to the current set, up to
    MAX_PHOTOS total — delete one to free a slot). Auth like editing: team
    code or signed share-link token. Files land in uploads/ and are linked
    in submission_photos."""
    if not 1 <= len(photos) <= MAX_PHOTOS:
        raise HTTPException(status_code=400, detail=f"send 1 to {MAX_PHOTOS} photos")
    with db() as conn:
        row = authorize_edit(conn, code, token)
        sub_id = row["id"]

        existing = [
            r["filename"]
            for r in conn.execute(
                "SELECT filename FROM submission_photos WHERE submission_id = ? ORDER BY id",
                (sub_id,),
            )
        ]
        if len(existing) + len(photos) > MAX_PHOTOS:
            raise HTTPException(
                status_code=400,
                detail=f"{MAX_PHOTOS} photos max — delete one to free a slot",
            )

        saved = []
        for photo in photos:
            ext = Path(photo.filename or "").suffix.lower()
            if ext not in PHOTO_EXTS:
                raise HTTPException(
                    status_code=400,
                    detail=f"unsupported file type {ext or '(none)'} — use {', '.join(sorted(PHOTO_EXTS))}",
                )
            data = await photo.read()
            if len(data) > MAX_PHOTO_BYTES:
                raise HTTPException(status_code=400, detail="each photo must be under 8MB")
            name = f"{sub_id}-{secrets.token_hex(6)}{ext}"
            (UPLOADS_DIR / name).write_bytes(data)
            saved.append(name)

        for name in saved:
            conn.execute(
                "INSERT INTO submission_photos (submission_id, filename) VALUES (?, ?)",
                (sub_id, name),
            )

        return {"ok": True, "photos": [f"/uploads/{n}" for n in existing + saved]}


class PhotoBody(BaseModel):
    code: str | None = None
    token: str | None = None
    photo: str


@app.post("/submissions/photos/delete")
def delete_photo(body: PhotoBody):
    """Remove one uploaded photo from the project: row + file on disk."""
    with db() as conn:
        row = authorize_edit(conn, body.code, body.token)
        sub_id = row["id"]
        name = body.photo.rsplit("/", 1)[-1]
        found = conn.execute(
            "SELECT id FROM submission_photos WHERE submission_id = ? AND filename = ?",
            (sub_id, name),
        ).fetchone()
        if not found:
            raise HTTPException(status_code=404, detail="no such photo on this project")
        conn.execute("DELETE FROM submission_photos WHERE id = ?", (found["id"],))
        (UPLOADS_DIR / name).unlink(missing_ok=True)
        rest = [
            r["filename"]
            for r in conn.execute(
                "SELECT filename FROM submission_photos WHERE submission_id = ? ORDER BY id",
                (sub_id,),
            )
        ]
        return {"ok": True, "photos": [f"/uploads/{f}" for f in rest]}


@app.post("/submissions/cover")
def set_cover(body: PhotoBody):
    """Make one of the project's uploaded photos the cover (the first photo is
    the cover everywhere, so this just reorders the set)."""
    with db() as conn:
        row = authorize_edit(conn, body.code, body.token)
        sub_id = row["id"]
        name = body.photo.rsplit("/", 1)[-1]
        rows = [
            r["filename"]
            for r in conn.execute(
                "SELECT filename FROM submission_photos WHERE submission_id = ? ORDER BY id",
                (sub_id,),
            )
        ]
        if name not in rows:
            raise HTTPException(status_code=404, detail="no such photo on this project")
        ordered = [name] + [f for f in rows if f != name]
        conn.execute("DELETE FROM submission_photos WHERE submission_id = ?", (sub_id,))
        for f in ordered:
            conn.execute(
                "INSERT INTO submission_photos (submission_id, filename) VALUES (?, ?)",
                (sub_id, f),
            )
        return {"ok": True, "photos": [f"/uploads/{f}" for f in ordered]}


@app.post("/vote")
def vote(body: Vote):
    """Cast the team's single vote. One code = one vote; re-voting replaces it,
    and a team can't vote for its own project."""
    if not VOTING_ENABLED:
        raise HTTPException(status_code=403, detail="voting is not open yet")
    with db() as conn:
        require_code(conn, body.code)
        target = conn.execute(
            "SELECT id, code FROM submissions WHERE id = ?", (body.submission_id,)
        ).fetchone()
        if target is None:
            raise HTTPException(status_code=404, detail="no such project")
        if target["code"] == body.code:
            raise HTTPException(status_code=400, detail="you can't vote for your own team")
        conn.execute(
            "INSERT INTO votes (voter_code, submission_id, created_at) VALUES (?, ?, ?)"
            " ON CONFLICT(voter_code) DO UPDATE SET"
            " submission_id = excluded.submission_id, created_at = excluded.created_at",
            (body.code, body.submission_id, now()),
        )
        votes = conn.execute(
            "SELECT COUNT(*) FROM votes WHERE submission_id = ?", (body.submission_id,)
        ).fetchone()[0]
        return {"ok": True, "submission_id": body.submission_id, "votes": votes}


@app.post("/share-link")
def share_link(body: ShareRequest, request: Request):
    """Mint a signed link a teammate can use to edit the page without the code."""
    with db() as conn:
        row = authorize_edit(conn, body.code, body.token)
        token = sign_token(conn, row["id"])
        return {
            "token": token,
            "submission_id": row["id"],
            "url": f"{base_url(request)}/wall/#/edit?token={token}",
            "expires_in_days": SHARE_TTL_DAYS,
        }


@app.post("/resolve-link")
def resolve_link(body: TokenRequest):
    """Load the submission an edit link points at, so the editor can prefill."""
    with db() as conn:
        sub_id = verify_token(conn, body.token)
        if sub_id is None:
            raise HTTPException(status_code=401, detail="this edit link is invalid or expired")
        row = conn.execute(
            "SELECT * FROM submissions WHERE id = ?", (sub_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="this project no longer exists")
        return {"submission": public(conn, row)}


@app.get("/submissions")
def list_submissions():
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM submissions ORDER BY created_at DESC"
        ).fetchall()
        return [public(conn, r) for r in rows]


@app.get("/submissions/{sub_id}")
def get_submission(sub_id: int):
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM submissions WHERE id = ?", (sub_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="not found")
        return public(conn, row)


# ---- skill distribution: install page, QR, personalized SKILL.md ----


def base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


def page_url(request: Request, sub_id: int) -> str:
    """Public link to a project's page on the wall (HashRouter deep link)."""
    return f"{base_url(request)}/wall/#/p/{sub_id}"


@app.get("/skill.md", response_class=PlainTextResponse)
def skill_md(request: Request):
    return SKILL_PATH.read_text().replace("__API_URL__", base_url(request))


@app.get("/install.sh", response_class=PlainTextResponse)
def install_sh(request: Request):
    base = base_url(request)
    return (
        "#!/bin/sh\nset -e\n"
        'DIR="$HOME/.vibe/skills/summer-vibe"\n'
        'mkdir -p "$DIR"\n'
        f'curl -fsSL "{base}/skill.md" -o "$DIR/SKILL.md"\n'
        'echo "Installed. Open vibe and type: /summer-vibe"\n'
    )


@app.get("/qr.png")
def qr_png(request: Request):
    # colors match the page: dark ink modules on the same field bg as the code boxes
    qr = qrcode.QRCode(border=2, box_size=10)
    qr.add_data(base_url(request))
    qr.make(fit=True)
    img = qr.make_image(fill_color=(43, 26, 18), back_color=(255, 250, 241))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    """Serve the install page (index.html), injecting the server URL and live count."""
    with db() as conn:
        n = conn.execute("SELECT COUNT(*) FROM submissions").fetchone()[0]
    html = INDEX_PATH.read_text(encoding="utf-8")
    return html.replace("__BASE_URL__", base_url(request)).replace("__COUNT__", str(n))


# the wall SPA (wall/dist, built with `npm run build`) — same origin as the api,
# so its empty VITE_API_BASE resolves /submissions here; hash routing needs no rewrites
if WALL_DIST.is_dir():
    app.mount("/wall", StaticFiles(directory=WALL_DIST, html=True), name="wall")

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
