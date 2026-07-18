// Cover image for a project: the first uploaded photo, otherwise a colorful
// placeholder picked deterministically from the project id so a build always
// shows the same cover. The tile shows covers monochrome (mistral) and
// reveals the real colors on hover.
const COVERS = [
  "sunset",
  "palm",
  "wave",
  "cocktail",
  "ring",
  "umbrella",
  "sailboat",
  "flamingo",
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// The cover is the first uploaded photo; without photos, a colorful
// placeholder picked deterministically from the project id.
export function coverFor(project) {
  if (project?.photos?.length) return project.photos[0];
  const seed = project?.id ?? hash(project?.name ?? "wall");
  return `${import.meta.env.BASE_URL}covers/${COVERS[seed % COVERS.length]}.svg`;
}

// Is this project showing a real (submitter-supplied) cover, vs a placeholder?
// The tile keeps the mistral monochrome veil only over placeholders.
export function hasOwnCover(project) {
  return !!project?.photos?.length;
}
