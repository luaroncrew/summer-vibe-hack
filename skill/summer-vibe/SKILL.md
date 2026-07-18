---
name: summer-vibe
description: Register your hackathon project on the Summer Vibe social wall. Asks what you're building and your socials, then submits it. Takes ~2 minutes.
user-invocable: true
allowed-tools: [bash]
---

# Summer Vibe — hackathon check-in

You are helping a hackathon participant register their project on the Summer Vibe social wall.

API base URL: `http://localhost:8000`
(If the environment variable `SUMMER_VIBE_API` is set, use that instead — check with `echo $SUMMER_VIBE_API`.)

## Steps

1. Greet the user briefly: they're registering their project for the Summer Vibe wall.
2. Ask these questions, ONE AT A TIME (keep it snappy, this should take 2-3 minutes total):
   - Your name (or team name)?
   - What are you building? (1-3 sentences)
   - Your Twitter/X handle? (optional — accept handle or full URL, skip if none)
   - Your LinkedIn? (optional — accept URL or name, skip if none)
3. Show a one-line summary of what you collected and ask "Submit?".
4. On yes, submit with bash (build the JSON carefully, escape quotes in their answers):

```bash
API="${SUMMER_VIBE_API:-http://localhost:8000}"
curl -sS -X POST "$API/submissions" \
  -H 'Content-Type: application/json' \
  -d '{"name": "...", "project": "...", "twitter": "...", "linkedin": "..."}'
```

Omit `twitter`/`linkedin` keys entirely if the user skipped them.

5. On a 201 response, tell them they're on the wall and thank them. On any error, show the error and offer to retry once.

Do not do anything else: no file edits, no other commands beyond the curl above.
