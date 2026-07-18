// Deterministic ascii "cover art" for each project until real images land.
// Every project gets a stable motif picked from its id/name, so the same build
// always shows the same picture.

export const MOTIFS = [
  // sun
  [
    "    \\   |   /    ",
    "     .-'''-.     ",
    "  - (  ***  ) -  ",
    "     '-...-'     ",
    "    /   |   \\    ",
  ],
  // palm
  [
    "     _.-'''-._   ",
    "   ,'  \\ | /  '. ",
    "       \\\\|//     ",
    "        |||      ",
    "   ~~~~~~|~~~~~~  ",
  ],
  // wave
  [
    "        .::.      ",
    "      .:(  ):.    ",
    "  .-~~     ~~~-.  ",
    " ~   ~~~~~   ~~ ~ ",
    "~~~~~~~~~~~~~~~~~~ ",
  ],
  // cocktail
  [
    "   \\  o  /   o   ",
    "    \\___/        ",
    "     \\_/    o    ",
    "      |          ",
    "  ___/_\\___      ",
  ],
  // swim ring
  [
    "     .-===-.     ",
    "   /  _____  \\   ",
    "  |  /     \\  |  ",
    "   \\  \\___/  /   ",
    "     '-===-'     ",
  ],
  // beach umbrella
  [
    "      .-'''-.    ",
    "    .' / | \\ '.  ",
    "   '--+--+--+--' ",
    "        ||       ",
    "  ~~~~~~||~~~~~~  ",
  ],
  // sandcastle
  [
    "     |>          ",
    "    [_]_[_]      ",
    "   [_______]     ",
    "   |__|__|__|    ",
    "  ~~~~~~~~~~~~~   ",
  ],
  // sailboat
  [
    "       |\\        ",
    "       | \\       ",
    "       |  \\      ",
    "     \\_|___\\_/   ",
    "  ~~~~~~~~~~~~~~  ",
  ],
  // shell
  [
    "      _.-._      ",
    "    .' \\ | / '.  ",
    "   /  \\ \\|/ /  \\ ",
    "   '.  \\ | /  .' ",
    "     '-._|_.-'   ",
  ],
];

// small stable hash from a string
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function motifFor(project) {
  const seed = project?.id ?? hash(project?.name ?? "wall");
  return MOTIFS[seed % MOTIFS.length];
}

// For empty slots: vary the ascii illustration by grid position.
export function motifByIndex(i) {
  return MOTIFS[i % MOTIFS.length];
}

// first sentence of the build description, for tile subtitles
export function blurb(text, max = 96) {
  if (!text) return "";
  const one = text.trim().split(/(?<=[.!?])\s/)[0].trim();
  const s = one.length ? one : text.trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}
