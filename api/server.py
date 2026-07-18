"""Summer Vibe Hack — submissions API.

Run:  pip install -r requirements.txt && uvicorn server:app --host 0.0.0.0 --port 8000
Data: SQLite file `submissions.db` next to this script.
"""

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DB_PATH = Path(__file__).parent / "submissions.db"

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
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


with db() as conn:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            project TEXT NOT NULL,
            twitter TEXT,
            linkedin TEXT,
            extra TEXT,
            created_at TEXT NOT NULL
        )
    """)


class Submission(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    project: str = Field(min_length=1, max_length=5000)
    twitter: str | None = Field(default=None, max_length=300)
    linkedin: str | None = Field(default=None, max_length=300)
    extra: str | None = Field(default=None, max_length=5000)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/submissions", status_code=201)
def create_submission(sub: Submission):
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO submissions (name, project, twitter, linkedin, extra, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                sub.name,
                sub.project,
                sub.twitter,
                sub.linkedin,
                sub.extra,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        return {"id": cur.lastrowid, "status": "saved"}


@app.get("/submissions")
def list_submissions():
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM submissions ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


@app.get("/submissions/{sub_id}")
def get_submission(sub_id: int):
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM submissions WHERE id = ?", (sub_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="not found")
        return dict(row)
