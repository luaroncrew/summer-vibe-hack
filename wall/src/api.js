// Single place the wall reads its data. The base url comes from .env
// (VITE_API_BASE). On ascii.dev the wall is served same-origin, so an empty
// base means relative fetches like /submissions.
const BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/+$/, "");

const url = (path) => `${BASE}${path}`;

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
