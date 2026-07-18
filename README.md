# Summer Vibe Hack

Social wall for hackathon builders, powered by [Mistral Vibe](https://github.com/mistralai/mistral-vibe).

Walk up to someone building, have them run one command, and 2 minutes later
their project + socials are on the wall.

## For participants (install the skill)

```sh
curl -fsSL https://raw.githubusercontent.com/luaroncrew/summer-vibe-hack/main/install.sh | sh
```

Then open `vibe` and type:

```
/summer-vibe
```

Point it at the wall server (once, before launching vibe):

```sh
export SUMMER_VIBE_API=http://<server-ip>:8000
```

## Run the server

```sh
cd api
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

Data lands in `api/submissions.db` (SQLite).

## API

| Method | Path | What |
|---|---|---|
| POST | `/submissions` | `{name, project, twitter?, linkedin?, extra?}` → saved |
| GET | `/submissions` | all submissions, newest first |
| GET | `/submissions/{id}` | one submission |
| GET | `/health` | liveness |

## How it works

```
participant's laptop                     your server
┌──────────────────────┐                ┌─────────────────────┐
│ vibe CLI             │                │ FastAPI + SQLite    │
│  /summer-vibe skill  │ ── curl ─────> │  POST /submissions  │
│  (asks 4 questions)  │                │  GET  /submissions  │──> wall UI (next)
└──────────────────────┘                └─────────────────────┘
```

The skill is a single `SKILL.md` file dropped into `~/.vibe/skills/` — no fork
of vibe, no MCP server, no extra dependencies on the participant's machine.
