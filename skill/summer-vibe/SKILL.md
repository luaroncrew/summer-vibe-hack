---
name: summer-vibe
description: Register your hackathon project on the Summer Vibe social wall. Asks what you're building, your team + socials, your links (repo/demo/video/deck), a cover image and some emojis, then submits. Takes ~3 minutes.
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
- `members`: list of `{name, twitter?, linkedin?, github?}` (at least one, required)
- `code`: the team's 6-digit sign-up code (required to submit)
- `emojis`: a short string of emoji, e.g. `"🌊🔥🏄"` (optional)
- `image_url`: a public image url used as the project's cover (optional)
- `demo_url`: live demo / deployment (optional)
- `video_url`: demo video (optional)
- `github_url`: the project repo (optional)
- `deck_url`: pitch deck (optional)

## Interview

Ask these in order. Skip nothing, but let people answer "none"/"skip" to any optional part.

1. **What are you building?** Name + description in a couple of phrases.
   → `project_name` and `description`. If they give only one, ask for the other.

2. **Your team + socials.** Show them a table to fill in one shot, e.g.:

   ```
   | name        | twitter    | linkedin              | github     |
   |-------------|------------|-----------------------|------------|
   | John Pork   | @johnpork  | linkedin.com/in/jpork | johnpork   |
   | Artur Mensch|            |                       |            |
   ```

   Tell them to copy it and fill what they have (handles or full urls both fine,
   blank cells are ok). Parse their reply back into `members`. If they'd rather just
   list names, that's fine too — take the names and move on.

3. **Project links** (all optional, ask together, accept whatever they give):
   github repo → `github_url`, live demo → `demo_url`, demo video → `video_url`,
   pitch deck → `deck_url`.

4. **Cover image** (optional). Offer two ways, in this order:
   - **From the repo:** if you're in their project directory, look for a screenshot,
     logo, or banner:
     ```bash
     find . -maxdepth 3 \( -path ./node_modules -o -path ./.git \) -prune -o \
       -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.gif' -o -iname '*.webp' -o -iname '*.svg' \) -print 2>/dev/null | head -30
     ```
     Show the candidates. If they pick one AND their repo is public on github, build a
     raw url from `github_url` + the file path
     (`https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>`, branch usually
     `main`) and use that as `image_url`. The wall needs a public url, so a bare local
     path only works if it's reachable that way.
   - **Direct link:** otherwise ask them to paste an image url (screenshot host, repo
     raw link, etc.). Use it verbatim as `image_url`.
   If neither, leave `image_url` unset — the wall shows a generated cover.

5. **Emojis** (optional). Ask which emoji capture the vibe, and suggest a few to pick
   from: 🌊 🔥 🏄 🌴 🍹 🏖️ ☀️ 🕶️ 🦩 ⛵ 🌅 🛟. Store their pick as one string in `emojis`.

6. **Sign-up code.** The 6-digit code the organizers handed out. Required — without it
   you can't submit.

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
    "emojis": "🌊🔥🏄",
    "image_url": "https://.../cover.png",
    "github_url": "https://github.com/team/project",
    "demo_url": "https://...",
    "video_url": "https://...",
    "deck_url": "https://...",
    "members": [
      {"name": "John Pork", "twitter": "@johnpork", "linkedin": "https://linkedin.com/in/johnpork", "github": "johnpork"},
      {"name": "Artur Mensch"}
    ]
  }'
```

Handle the response:
- **201** → they're on the wall. thank them, and mention they can rerun `/summer-vibe`
  anytime with the same code to update their entry. stop.
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

   That returns `{valid, submission}`. Show a short recap of the current entry.

2. Ask **what they want to change.** Any field from the interview is fair game —
   name, description, the team table, emojis, cover image, or any of the links
   (github/demo/video/deck). This is the moment to add links they didn't have during
   the first check-in (pitch deck went live, demo got deployed, video is up).

3. Send a `PUT` to the same `/submissions` url with `code` plus **only the fields that
   changed.** Note: `members`, if you include it, replaces the whole list, so send every
   member (not just the new one).

   ```bash
   curl -sS -X PUT "__API_URL__/submissions" \
     -H 'Content-Type: application/json' \
     -d '{"code":"123456","deck_url":"https://...","video_url":"https://..."}'
   ```

   Response: **200** updated (confirm what changed), **401** bad code, **404** no entry
   for this code yet (fall back to POST).

Do not do anything else: no file edits, and no commands beyond the `find` above and the
curl calls.
