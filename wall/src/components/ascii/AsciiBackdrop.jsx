import SwimmingRing from "./SwimmingRing.jsx";
import Wave from "./Wave.jsx";
import BeachUmbrella from "./BeachUmbrella.jsx";

// The living ascii seascape behind the grid: the wave along the floor, the
// swim ring drifting, the umbrella strolling past. Kept low-contrast so the
// projects always read on top, with a soft vignette to seat them.
export default function AsciiBackdrop() {
  return (
    <div aria-hidden="true">
      <Wave />
      <SwimmingRing />
      <BeachUmbrella />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(120% 80% at 50% 42%, transparent 40%, rgba(10,7,4,0.55) 100%)",
        }}
      />
    </div>
  );
}
