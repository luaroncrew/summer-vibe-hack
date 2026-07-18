import { useEffect, useRef } from "react";
import { useReducedMotion } from "../../lib/useReducedMotion.js";

// A 2d ascii sea running along the bottom of the wall: three stacked sine
// layers scrolling at different speeds so it reads as moving water. Sizes
// itself to the viewport and re-fits on resize.
export default function Wave() {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const FONT = 14; // px
    const CHAR_W = FONT * 0.6;
    const BAND_ROWS = 13;

    let COLS = 0;
    function fit() {
      COLS = Math.ceil(window.innerWidth / CHAR_W) + 2;
    }
    fit();

    // three layers: [amplitude, frequency, speed, depth-from-band-top, glyph]
    const LAYERS = [
      { amp: 2.2, freq: 0.09, spd: 0.9, base: 3.5, ch: "~" },
      { amp: 3.0, freq: 0.06, spd: -0.6, base: 6.0, ch: "≈" },
      { amp: 1.6, freq: 0.14, spd: 1.3, base: 9.0, ch: "-" },
    ];

    function frame(t) {
      const grid = new Array(BAND_ROWS);
      for (let r = 0; r < BAND_ROWS; r++) grid[r] = new Array(COLS).fill(" ");

      for (const L of LAYERS) {
        for (let x = 0; x < COLS; x++) {
          const y = L.base + L.amp * Math.sin(x * L.freq + t * L.spd);
          const r = Math.round(y);
          if (r >= 0 && r < BAND_ROWS) grid[r][x] = L.ch;
          // a little foam trailing under each crest
          if (r + 1 < BAND_ROWS && (x + Math.floor(t)) % 11 === 0)
            grid[r + 1][x] = ".";
        }
      }

      el.textContent = grid.map((row) => row.join("")).join("\n");
    }

    if (reduced) {
      frame(0.6);
      return;
    }

    let raf,
      last = 0,
      t = 0;
    function loop(now) {
      if (now - last > 70) {
        last = now;
        t += 0.12;
        frame(t);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [reduced]);

  return (
    <pre
      ref={ref}
      aria-hidden="true"
      className="ascii-layer flame-text"
      style={{
        left: 0,
        bottom: 0,
        top: "auto",
        width: "100vw",
        fontSize: "14px",
        opacity: 0.17,
        maskImage: "linear-gradient(to top, #000 55%, transparent)",
        WebkitMaskImage: "linear-gradient(to top, #000 55%, transparent)",
      }}
    />
  );
}
