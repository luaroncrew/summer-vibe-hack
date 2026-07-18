// Single place the wall reads its data. The base url comes from .env
// (VITE_API_BASE). On ascii.dev the wall is served same-origin, so an empty
// base means relative fetches like /submissions.
const BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

const url = (path) => `${BASE}${path}`;

// The skill install page (the FastAPI root serves it). Empty tiles link here so
// the next builder can get on the wall.
export const installUrl = `${BASE}/`;

// The wall reads from the submissions api, whose model is: project_name,
// description, demo_url, members[{name, twitter, linkedin}], created_at.
// Normalize it into one shape the ui uses, tolerant of the older field names.
function normalize(s) {
  return {
    id: s.id,
    name: s.project_name ?? s.name ?? "untitled",
    description: s.description ?? s.project ?? "",
    emojis: s.emojis ?? "",
    imageUrl: s.image_url ?? null,
    demoUrl: s.demo_url ?? null,
    videoUrl: s.video_url ?? null,
    githubUrl: s.github_url ?? null,
    deckUrl: s.deck_url ?? null,
    members: Array.isArray(s.members) ? s.members : [],
    votes: s.votes ?? 0,
    createdAt: s.created_at ?? null,
  };
}

export async function fetchProjects() {
  const res = await fetch(url("/submissions"));
  if (!res.ok) throw new Error(`wall is unreachable (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalize) : [];
}

export async function fetchProject(id) {
  const res = await fetch(url(`/submissions/${id}`));
  if (res.status === 404) throw new Error("not-found");
  if (!res.ok) throw new Error(`could not load this project (${res.status})`);
  return normalize(await res.json());
}

// --- editing -------------------------------------------------------------
// The form uses camelCase; the api uses snake_case. Turn one into the other,
// sending empty optional fields as null so clearing a link actually clears it.
function toApi(v) {
  const opt = (s) => {
    const t = (s ?? "").trim();
    return t.length ? t : null;
  };
  return {
    project_name: (v.name ?? "").trim(),
    description: (v.description ?? "").trim(),
    emojis: opt(v.emojis),
    image_url: opt(v.imageUrl),
    demo_url: opt(v.demoUrl),
    video_url: opt(v.videoUrl),
    github_url: opt(v.githubUrl),
    deck_url: opt(v.deckUrl),
    members: (v.members ?? [])
      .filter((m) => (m.name ?? "").trim().length)
      .map((m) => ({
        name: m.name.trim(),
        twitter: opt(m.twitter),
        linkedin: opt(m.linkedin),
        github: opt(m.github),
      })),
  };
}

async function postJSON(path, body, method = "POST") {
  const res = await fetch(url(path), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `request failed (${res.status})`);
  return data;
}

// Validate a code and, if it already has a project, hand back the submission
// plus which project this team has voted for (null if it hasn't voted yet).
export async function lookupCode(code) {
  // NOT "/lookup": the on.ascii.dev gateway owns that path and shadows it
  const data = await postJSON("/submissions/lookup", { code });
  return {
    valid: data.valid,
    submission: data.submission ? normalize(data.submission) : null,
    votedFor: data.voted_for ?? null,
  };
}

// Cast the team's single vote for a project. Returns the project's new count.
export async function castVote(code, submissionId) {
  return postJSON("/vote", { code, submission_id: submissionId });
}

// Load the project a signed edit link points at.
export async function resolveLink(token) {
  const data = await postJSON("/resolve-link", { token });
  return normalize(data.submission);
}

// Mint a signed edit link a teammate can use. auth is { code } or { token }.
export async function createShareLink(auth) {
  return postJSON("/share-link", auth);
}

// Save the form. auth is { code } or { token }; existing chooses PUT vs POST.
export async function saveSubmission({ auth, values, existing }) {
  const payload = { ...auth, ...toApi(values) };
  if (existing) {
    const data = await postJSON("/submissions", payload, "PUT");
    return normalize(data.submission);
  }
  return postJSON("/submissions", payload); // create -> { id, status }
}
