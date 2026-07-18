"""Generate 100 pre-shared 6-digit team codes.

Idempotent: tops the codes table up to 100 and dumps ALL codes to codes.txt
(next to this script) and stdout. Give one code per team.
"""

import secrets
import sqlite3
from pathlib import Path

HERE = Path(__file__).parent
DB_PATH = HERE / "submissions.db"
OUT_PATH = HERE / "codes.txt"
TARGET = 100

conn = sqlite3.connect(DB_PATH)
conn.execute("CREATE TABLE IF NOT EXISTS codes (code TEXT PRIMARY KEY)")

existing = {r[0] for r in conn.execute("SELECT code FROM codes")}
while len(existing) < TARGET:
    # 100000-999999: avoids leading zeros getting lost when read aloud
    code = str(secrets.randbelow(900000) + 100000)
    if code not in existing:
        conn.execute("INSERT INTO codes (code) VALUES (?)", (code,))
        existing.add(code)
conn.commit()

codes = sorted(existing)
OUT_PATH.write_text("\n".join(codes) + "\n")
print("\n".join(codes))
print(f"\n{len(codes)} codes in DB, written to {OUT_PATH}")
