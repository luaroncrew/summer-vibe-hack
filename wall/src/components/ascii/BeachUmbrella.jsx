import { useEffect, useRef } from "react";
import { useReducedMotion } from "../../lib/useReducedMotion.js";

// A beach umbrella that strolls across the wall, bobbing as if planted in sand
// on a gentle swell. Static ascii art moved with transforms — cheap and smooth.
const UMBRELLA = [
  "       ______       ",
  "    .-'      '-.    ",
  "  .'  \\   |   /  '. ",
  " /_____\\__|__/_____\\",
  "         |||        ",
  "         |||        ",
  "         |||        ",
  "         |||        ",
];

export default function BeachUmbrella() {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduced) {
      el.style.transform = `translate(${window.innerWidth * 0.12}px, ${
        window.innerHeight * 0.52
      }px)`;
      return;
    }

    let raf,
      last = 0,
      t = 0;
    const baseY = window.innerHeight * 0.5;
    const span = () => window.innerWidth + el.offsetWidth;

    function loop(now) {
      if (now - last > 60) {
        last = now;
        t += 0.02;
        // walk left->right and wrap; bob and sway on a slow swell
        const x = ((t * 26) % span()) - el.offsetWidth;
        const y = baseY + Math.sin(t * 1.6) * 9;
        const sway = Math.sin(t * 1.1) * 2.2;
        el.style.transform = `translate(${x}px, ${y}px) skewX(${sway}deg)`;
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <pre
      ref={ref}
      aria-hidden="true"
      className="ascii-layer flame-text"
      style={{
        top: 0,
        left: 0,
        fontSize: "clamp(9px, 1.1vw, 13px)",
        fontWeight: 600,
        opacity: 0.2,
      }}
    >
      {UMBRELLA.join("\n")}
    </pre>
  );
}
