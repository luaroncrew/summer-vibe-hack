import SwimmingRing from "./SwimmingRing.jsx";
import Wave from "./Wave.jsx";
import BeachUmbrella from "./BeachUmbrella.jsx";

// The living ascii seascape behind the grid: the wave along the floor, the
// swim ring(s) flying, the umbrella strolling past. Kept low-contrast so the
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
      <BeachUmbrella />
    </div>
  );
}
