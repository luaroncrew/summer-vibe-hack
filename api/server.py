"""Summer Vibe Hack — submissions API + skill install page.

Run:  pip install -r requirements.txt && uvicorn server:app --host 0.0.0.0 --port 3000 --proxy-headers
Data: SQLite file `submissions.db` next to this script.
Auth: pre-generated 6-digit team codes (see generate_codes.py). One code = one
      team = one submission; the same code authorizes later edits.
"""

import io
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

import qrcode
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field

DB_PATH = Path(__file__).parent / "submissions.db"
SKILL_PATH = Path(__file__).resolve().parent.parent / "skill" / "summer-vibe" / "SKILL.md"
INDEX_PATH = Path(__file__).resolve().parent.parent / "index.html"
CODE_RE = re.compile(r"^\d{6}$")

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
    return d


def require_code(conn: sqlite3.Connection, code: str) -> None:
    if not CODE_RE.match(code or ""):
        raise HTTPException(status_code=401, detail="code must be 6 digits")
    if conn.execute("SELECT 1 FROM codes WHERE code = ?", (code,)).fetchone() is None:
        raise HTTPException(status_code=401, detail="unknown code")


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
    description: str = Field(min_length=1, max_length=5000)
    emojis: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=1000)
    demo_url: str | None = Field(default=None, max_length=1000)
    video_url: str | None = Field(default=None, max_length=1000)
    github_url: str | None = Field(default=None, max_length=1000)
    deck_url: str | None = Field(default=None, max_length=1000)
    members: list[Member] = Field(min_length=1, max_length=20)


class SubmissionUpdate(BaseModel):
    code: str
    project_name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=5000)
    emojis: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=1000)
    demo_url: str | None = Field(default=None, max_length=1000)
    video_url: str | None = Field(default=None, max_length=1000)
    github_url: str | None = Field(default=None, max_length=1000)
    deck_url: str | None = Field(default=None, max_length=1000)
    members: list[Member] | None = Field(default=None, min_length=1, max_length=20)


class Lookup(BaseModel):
    code: str


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/submissions", status_code=201)
def create_submission(sub: Submission):
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
        return {"id": cur.lastrowid, "status": "saved"}


@app.put("/submissions")
def update_submission(upd: SubmissionUpdate):
    with db() as conn:
        require_code(conn, upd.code)
        row = conn.execute(
            "SELECT * FROM submissions WHERE code = ?", (upd.code,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="no submission for this code yet")
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
        return {"status": "updated", "submission": public(conn, row)}


@app.post("/lookup")
def lookup(body: Lookup):
    """For the leaderboard edit flow: is this code valid, and what did it submit?"""
    with db() as conn:
        require_code(conn, body.code)
        row = conn.execute(
            "SELECT * FROM submissions WHERE code = ?", (body.code,)
        ).fetchone()
        return {"valid": True, "submission": public(conn, row) if row else None}


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
