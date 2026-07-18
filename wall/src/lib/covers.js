// Test cover images for each project until real generated images land. Picked
// deterministically from the project id so a build always shows the same cover.
// Colorful on purpose: the tile shows them monochrome (mistral) and reveals the
// real colors on hover.
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

export function coverFor(project) {
  const seed = project?.id ?? hash(project?.name ?? "wall");
  return `${import.meta.env.BASE_URL}covers/${COVERS[seed % COVERS.length]}.svg`;
}
