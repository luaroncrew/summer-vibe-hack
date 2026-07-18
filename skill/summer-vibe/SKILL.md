---
name: summer-vibe
description: Register your hackathon project on the Summer Vibe social wall. Asks what you're building, your socials and your team code, then submits. Takes ~3 minutes.
user-invocable: true
allowed-tools: [bash]
---

# Summer Vibe — hackathon check-in

You are helping a hackathon participant register their project on the Summer Vibe social wall.

API base URL: `__API_URL__`
(If that looks like an unreplaced placeholder, use `$SUMMER_VIBE_API` instead — check with `echo $SUMMER_VIBE_API`.)

## Steps

1. Greet the user briefly: they're registering their project for the Summer Vibe wall.
2. Ask these questions, ONE AT A TIME (keep it snappy, this should take 2-3 minutes total):
   - Your name (or team name)?
   - What are you building? (1-3 sentences)
   - Your Twitter/X handle? (optional — accept handle or full URL, skip if none)
   - Your LinkedIn? (optional — accept URL or name, skip if none)
   - Your team's 6-digit code? (required — the organizers handed it out; without it you can't submit)
3. Show a one-line summary of what you collected and ask "Submit?".
4. On yes, submit with bash (build the JSON carefully, escape quotes in their answers):

```bash
curl -sS -X POST "__API_URL__/submissions" \
  -H 'Content-Type: application/json' \
  -d '{"code": "123456", "name": "...", "project": "...", "twitter": "...", "linkedin": "..."}'
```

Omit `twitter`/`linkedin` keys entirely if the user skipped them.

5. Handle the response:
   - **201** → they're on the wall; thank them and stop.
   - **401** → the code is wrong; re-ask the code and retry once.
   - **409** → this code already submitted. Ask if they want to update their entry;
     on yes, send the same payload with `PUT` instead of `POST` (same URL, same body —
     include only the fields they want to change, plus `code`).
   - anything else → show the error, offer to retry once.

Do not do anything else: no file edits, no other commands beyond the curl calls above.
