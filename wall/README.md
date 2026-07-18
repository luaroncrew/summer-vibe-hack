# the wall

the display for summer vibe hack: a dark ascii seascape with one tile per
project, read live from the submissions api. click a tile to open its page.

built with vite + react + tailwind, in ibm plex mono. dark theme, r0 corners,
mistral/summer flame palette. ambient ascii backdrop: the spa's swimming ring,
a 2d wave, and a strolling beach umbrella.

## run it

```sh
npm install
npm run dev            # http://localhost:5180
```

it reads projects from the api set in `.env`:

```sh
# .env  (copy from .env.example)
VITE_API_BASE=http://localhost:8000
```

start the api first (from the repo root):

```sh
cd api
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

## how the link is read

the base url lives in `.env` as `VITE_API_BASE`, matching the single-source-of-
truth pattern the rest of the repo uses. leave it empty to fetch same-origin
(`/submissions`), which is what you want on ascii.dev where the wall is served
next to the api. routes use a hash (`#/p/<id>`) so deep links work from static
hosting with no server rewrite.

## build for ascii.dev

```sh
npm run build         # -> dist/  (static files)
```

serve `dist/` from ascii.dev with `VITE_API_BASE` empty so the wall and the api
share an origin.

## what's here

| path | what |
|---|---|
| `src/App.jsx` | the 3x3 wall grid, paging, live count |
| `src/components/ProjectPage.jsx` | one project, template + slot for the ai write-up |
| `src/components/ascii/` | swimming ring, wave, beach umbrella |
| `src/lib/motifs.js` | per-project ascii cover art (placeholder until real images) |

each tile's picture is a deterministic ascii motif for now. the project page
leaves a "generated overview" slot for the model-written summary that gets
filled in later.
