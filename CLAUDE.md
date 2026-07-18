# Summer Vibe Hack

A social wall for hackathon builders. A `vibe` skill collects a team's project
over a short interview and posts it to an API; a public wall displays every
submission. Everything is meant to be hosted together on an ascii.dev box.

## Layout

- `api/` — FastAPI + SQLite submissions server. Also serves the skill install
  page, the install script, the personalized `SKILL.md`, and a QR code.
  - `server.py` — every route (submissions / 6-digit-code auth / members, plus
    skill distribution: `/`, `/install.sh`, `/skill.md`, `/qr.png`).
  - `generate_codes.py` — tops the team codes up to 100 (writes `codes.txt`).
- `index.html` — the landing / install page (single-screen, IBM Plex Mono,
  ascii swimming rings). Served at `GET /`; the API substitutes `__BASE_URL__`
  (server URL) and `__COUNT__` (live project count) per request.
- `skill/summer-vibe/SKILL.md` — the vibe skill. `__API_URL__` is substituted
  per request when served at `/skill.md`.
- `wall/` — the public display: a Vite + React + Tailwind SPA reading
  `GET /submissions`. See `wall/README.md`.

## Run

API (from `api/`):

```sh
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python generate_codes.py
.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000
```

Wall (from `wall/`): `npm install && npm run dev` (port 5180; reads
`VITE_API_BASE`, default `http://localhost:8000`).

## Conventions

- One accent color (mistral flame), IBM Plex Mono, r0 (no border radius).
- The server URL is the single source of truth: the API injects it into the
  page, install script, skill, and QR from the incoming request — nothing
  hardcodes a host. The wall uses `VITE_API_BASE` (empty = same origin).
- Auth is a 6-digit team code, one per team; the same code edits the entry later.
- Gitignored: `submissions.db`, `codes.txt`, `.env`, `api/.venv/`, `node_modules/`.
