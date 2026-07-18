# Summer Vibe Hack

Social wall for hackathon builders, powered by [Mistral Vibe](https://github.com/mistralai/mistral-vibe).

Walk up to a team building, have them scan a QR code, and 3 minutes later
their project + every member's socials are on the wall.

## For participants

Scan the QR code (or open the server URL) — the page shows one command:

```sh
curl -fsSL https://<server>/install.sh | sh
```

Then open `vibe` and type `/summer-vibe`. The skill asks:

1. What do you build? Name + description, 2 phrases.
2. List all members of your team.
3. Per member: socials (twitter/linkedin)?
4. Your team's 6-digit sign-up code.

The install script and skill are served by the API itself with the server URL
baked in — zero configuration on the participant's machine, no fork of vibe.

## Auth: pre-shared codes

The only auth primitive is a 6-digit code, one per team, generated upfront:

```sh
python generate_codes.py   # tops the codes table up to 100, writes codes.txt
```

`codes.txt` is gitignored — hand the codes out physically. A code is required
to submit; the same code lets the team edit their entry later (leaderboard).

## Run the server

```sh
cd api
pip install -r requirements.txt
python generate_codes.py
uvicorn server:app --host 0.0.0.0 --port 3000 --proxy-headers --forwarded-allow-ips='*'
```

Data lands in `api/submissions.db` (SQLite). Hosted on an [ascii.dev Box](https://ascii.dev)
(`box new --ttl 604800`, then `host 3000 --public` inside the box).

## API

| Method | Path | What |
|---|---|---|
| POST | `/submissions` | `{code, project_name, description, members: [{name, twitter?, linkedin?}]}` → saved (401 bad code, 409 already submitted) |
| PUT | `/submissions` | same shape, `code` identifies the entry; `members` replaces the whole list |
| POST | `/lookup` | `{code}` → `{valid, submission\|null}` — for the leaderboard edit flow |
| GET | `/submissions` | all entries with nested members, newest first (codes never exposed) |
| GET | `/submissions/{id}` | one entry |
| GET | `/` | install page with QR code |
| GET | `/install.sh`, `/skill.md`, `/qr.png` | skill distribution, URL substituted per-request |
| GET | `/health` | liveness |

## How it works

```
team laptop                                   server (ascii.dev box)
┌──────────────────────┐                     ┌────────────────────────────┐
│ vibe /summer-vibe    │ ── POST + code ───> │ FastAPI + SQLite           │
│ (interview, ~3 min)  │                     │  submissions ─┬─ members   │
└──────────────────────┘                     │  codes (pre-shared, 100)   │
        ▲ scan QR, curl install.sh           │  serves skill + QR page    │
        └────────────────────────────────────┴────────────────────────────┘
                                                   │ GET /submissions
                                                   ▼
                                             showcase + leaderboard (next)
```
