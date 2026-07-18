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


with db() as conn:
    conn.execute("CREATE TABLE IF NOT EXISTS codes (code TEXT PRIMARY KEY)")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE REFERENCES codes(code),
            project_name TEXT NOT NULL,
            description TEXT NOT NULL,
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
            linkedin TEXT
        )
    """)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def public(conn: sqlite3.Connection, row: sqlite3.Row) -> dict:
    d = dict(row)
    d.pop("code", None)
    d["members"] = [
        {"name": m["name"], "twitter": m["twitter"], "linkedin": m["linkedin"]}
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
            "INSERT INTO members (submission_id, name, twitter, linkedin) VALUES (?, ?, ?, ?)",
            (submission_id, m.name, m.twitter, m.linkedin),
        )


class Member(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    twitter: str | None = Field(default=None, max_length=300)
    linkedin: str | None = Field(default=None, max_length=300)


class Submission(BaseModel):
    code: str
    project_name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=5000)
    members: list[Member] = Field(min_length=1, max_length=20)


class SubmissionUpdate(BaseModel):
    code: str
    project_name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=5000)
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
        cur = conn.execute(
            "INSERT INTO submissions (code, project_name, description, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (sub.code, sub.project_name, sub.description, ts, ts),
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
    img = qrcode.make(base_url(request))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    base = base_url(request)
    with db() as conn:
        n = conn.execute("SELECT COUNT(*) FROM submissions").fetchone()[0]
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Summer Vibe Hack</title>
<style>
  body {{ font-family: ui-monospace, monospace; max-width: 640px; margin: 40px auto; padding: 0 16px; }}
  pre {{ background: #111; color: #7CFC00; padding: 14px; border-radius: 8px; overflow-x: auto; }}
  img {{ display: block; margin: 24px auto; width: 240px; height: 240px; }}
</style></head>
<body>
<h1>☀️ Summer Vibe Hack</h1>
<p>Put your project on the wall. Takes ~3 minutes, from your terminal.</p>
<h2>1. Install the skill</h2>
<pre>curl -fsSL {base}/install.sh | sh</pre>
<h2>2. Run it</h2>
<pre>vibe
/summer-vibe</pre>
<p>Have your team's 6-digit code ready — you'll need it to submit
(and later to edit your entry on the leaderboard).</p>
<img src="/qr.png" alt="QR code to this page">
<p style="text-align:center">{n} project(s) on the wall</p>
</body></html>"""
