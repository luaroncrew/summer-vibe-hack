---
name: summer-vibe
description: Register your hackathon project on the Summer Vibe social wall. Asks what you're building, your team members and their socials, then submits. Takes ~3 minutes.
user-invocable: true
allowed-tools: [bash]
---

# Summer Vibe — hackathon check-in

You are helping a hackathon participant register their project on the Summer Vibe social wall.

API base URL: `__API_URL__`
(If that looks like an unreplaced placeholder, use `$SUMMER_VIBE_API` instead — check with `echo $SUMMER_VIBE_API`.)

## Steps

Greet the user briefly, then ask these questions, ONE AT A TIME (keep it snappy, ~3 minutes total):

1. **"What do you build? Name + description, write in 2 phrases."**
   → gives you `project_name` and `description`. If they only give one or the other, ask for the missing piece.
2. **"List all members of your team. e.g (John Pork, Artur Mensch, ...)"**
   → parse into a list of names.
3. For EACH member from step 2, ask separately, one message per member:
   **"Socials of <member name> (twitter/linkedin)?"**
   → accept handles or full URLs; either or both may be skipped ("none"/"skip" is fine).
4. **"Your team's 6-digit sign-up code?"** (required — the organizers handed it out; without it you can't submit)

Then show a short summary of everything collected and ask "Submit?".

On yes, submit with bash (build the JSON carefully, escape quotes in their answers):

```bash
curl -sS -X POST "__API_URL__/submissions" \
  -H 'Content-Type: application/json' \
  -d '{
    "code": "123456",
    "project_name": "...",
    "description": "...",
    "members": [
      {"name": "John Pork", "twitter": "@johnpork", "linkedin": "https://linkedin.com/in/johnpork"},
      {"name": "Artur Mensch"}
    ]
  }'
```

Omit `twitter`/`linkedin` keys for members who skipped them. Do NOT ask about demos during initial registration.

Handle the response:
- **201** → they're on the wall; thank them and stop.
- **401** → the code is wrong; re-ask the code and retry once.
- **409** → this code already submitted. Ask if they want to update their entry;
  on yes, ask what to change — any of the fields above, plus a demo link (`"demo_url"`,
  a URL to a live demo/video/deployment) — then send `PUT` instead of `POST` (same URL),
  including `code` plus only what changed (note: `members`, when included, replaces the
  whole member list, so send all members).
- anything else → show the error, offer to retry once.

Do not do anything else: no file edits, no other commands beyond the curl calls above.
