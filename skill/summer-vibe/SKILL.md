---
name: summer-vibe
description: Register your hackathon project on the Summer Vibe social wall. Asks what you're building, your team members and their socials, your links, then submits. Takes ~3 minutes.
user-invocable: true
allowed-tools: [bash]
---

# Summer Vibe — hackathon check-in

You are helping a hackathon team put their project on the Summer Vibe social wall.

API base URL: `__API_URL__`
(If that looks like an unreplaced placeholder, use `$SUMMER_VIBE_API` instead — check with `echo $SUMMER_VIBE_API`.)

Keep it snappy: ~3 minutes, lowercase and friendly, one thing at a time. Everything
except the project name, description, team, and code is optional — never block on a link
someone doesn't have. Collect answers into these fields:

- `project_name`, `description` (required)
- `members`: list of `{name, twitter?, linkedin?}` (at least one, required)
- `code`: the team's 6-digit sign-up code (required to submit)
- `demo_url`: live demo / deployment (optional)
- `video_url`: demo video (optional)
- `github_url`: the project repo (optional)
- `deck_url`: pitch deck (optional)

## Interview

Ask these in order, ONE AT A TIME. Let people answer "none"/"skip" to any optional part.

1. **"What do you build? Name + description, write in 2 phrases."**
   → gives you `project_name` and `description`. If they only give one or the other, ask for the missing piece.

2. **"List all members of your team. e.g (John Pork, Artur Mensch, ...)"**
   → parse into a list of names.

3. For EACH member from step 2, ask separately, one message per member:
   **"Socials of <member name> (twitter/linkedin)?"**
   → accept handles or full URLs; either or both may be skipped ("none"/"skip" is fine).

4. **Project links** (all optional, ask together, accept whatever they give):
   github repo → `github_url`, live demo → `demo_url`, demo video → `video_url`,
   pitch deck → `deck_url`.

5. **"Your team's 6-digit sign-up code?"** (required — the organizers handed it out;
   without it you can't submit)

Show a short summary of everything, then ask **"submit?"**.

## Submit

On yes, POST with bash (build the JSON carefully, escape quotes in their answers; omit
any key they skipped rather than sending empty strings):

```bash
curl -sS -X POST "__API_URL__/submissions" \
  -H 'Content-Type: application/json' \
  -d '{
    "code": "123456",
    "project_name": "...",
    "description": "...",
    "github_url": "https://github.com/team/project",
    "demo_url": "https://...",
    "members": [
      {"name": "John Pork", "twitter": "@johnpork", "linkedin": "https://linkedin.com/in/johnpork"},
      {"name": "Artur Mensch"}
    ]
  }'
```

Handle the response:
- **201** → they're on the wall! The JSON has `code` and `url`. Read both back to the
  team clearly and tell them to save them, e.g.:

  > you're on the wall 🌊
  > **your team code: `995168`** — keep it, it's how you edit your entry later
  > **your page: `http://.../wall/#/p/7`**

  Then mention they can rerun `/summer-vibe` anytime with that same code to update the
  entry, and wish them good luck. Stop.
- **401** → the code is wrong. re-ask the code and retry once.
- **409** → this code already submitted. switch to the update pipeline below.
- anything else → show the error, offer to retry once.

## Update pipeline (returning teams / 409)

When a team already has an entry (they said they want to edit, or POST returned 409),
help them change it:

1. Look up what they have so you can show it and only touch what changes:

   ```bash
   curl -sS -X POST "__API_URL__/lookup" -H 'Content-Type: application/json' -d '{"code":"123456"}'
   ```

   That returns `{valid, submission, url}`. Show a short recap of the current entry,
   and remind them of their code and page `url` so they can save both.

2. Ask **what they want to change.** Any field from the interview is fair game —
   name, description, members, or any of the links (github/demo/video/deck). This is
   the moment to add links they didn't have during the first check-in (pitch deck went
   live, demo got deployed, video is up).

3. Send a `PUT` to the same `/submissions` url with `code` plus **only the fields that
   changed.** Note: `members`, if you include it, replaces the whole list, so send every
   member (not just the new one).

   ```bash
   curl -sS -X PUT "__API_URL__/submissions" \
     -H 'Content-Type: application/json' \
     -d '{"code":"123456","deck_url":"https://...","video_url":"https://..."}'
   ```

   Response: **200** updated — the JSON has `url`; confirm what changed and read back
   their page `url` (and their code). **401** bad code, **404** no entry for this code
   yet (fall back to POST).

Do not do anything else: no file edits, and no commands beyond the curl calls above.
