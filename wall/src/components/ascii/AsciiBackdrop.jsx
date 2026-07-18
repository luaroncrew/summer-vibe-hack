import SwimmingRing from "./SwimmingRing.jsx";
import Wave from "./Wave.jsx";

// The living ascii seascape behind the grid: the wave along the floor and the
// swim ring(s) flying. Kept low-contrast so the
// content always reads on top. `rings` controls how many swimming rings fly
// around (the project page turns this up). The vignette sits *under* the rings
// so they stay legible near the edges.
export default function AsciiBackdrop({ rings = 1, ringOpacity = 0.22 }) {
  return (
    <div aria-hidden="true">
      <Wave />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(120% 80% at 50% 42%, transparent 45%, rgba(10,7,4,0.5) 100%)",
        }}
      />
      <SwimmingRing count={rings} opacity={ringOpacity} />
    </div>
  );
}
