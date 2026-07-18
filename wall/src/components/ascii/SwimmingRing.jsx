import { useEffect, useRef } from "react";
import { useReducedMotion } from "../../lib/useReducedMotion.js";

// Thin 3d ascii swimming rings that fly, spin and bounce off the viewport edges
// — the same motion as the landing page, tuned to sit behind the content.
// `count` sets how many rings; `opacity` scales the whole group.
export default function SwimmingRing({ count = 1, opacity = 0.22 }) {
  const hostRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const COLS = 38,
      ROWS = 19,
      R1 = 0.5,
      R2 = 2; // thin tube, wide hole
    const chars = ".,-~:;=!*#$@";
    const k = Math.max(0.62, Math.min(1, window.innerWidth / 1280));

    // size, per-ring opacity, start fraction of viewport, velocity px/frame
    const BASE = [
      { font: 13, op: 1.0, fx: 0.1, fy: 0.16, vx: 1.2, vy: 0.9 },
      { font: 9, op: 0.8, fx: 0.66, fy: 0.12, vx: -1.0, vy: 1.3 },
      { font: 11, op: 0.9, fx: 0.22, fy: 0.7, vx: 1.5, vy: -0.8 },
      { font: 8, op: 0.7, fx: 0.84, fy: 0.74, vx: -1.1, vy: -1.1 },
      { font: 12, op: 0.85, fx: 0.9, fy: 0.34, vx: 0.8, vy: 1.4 },
      { font: 10, op: 0.85, fx: 0.44, fy: 0.06, vx: -0.9, vy: 1.1 },
      { font: 14, op: 1.0, fx: 0.05, fy: 0.48, vx: 1.0, vy: -1.2 },
      { font: 8, op: 0.7, fx: 0.52, fy: 0.92, vx: 1.3, vy: -0.9 },
      { font: 11, op: 0.9, fx: 0.95, fy: 0.6, vx: -1.2, vy: 0.8 },
      { font: 9, op: 0.8, fx: 0.32, fy: 0.36, vx: -1.4, vy: -0.8 },
    ];

    const rings = Array.from({ length: count }, (_, i) => {
      const s = BASE[i % BASE.length];
      const el = document.createElement("pre");
      el.className = "flame-text";
      el.setAttribute("aria-hidden", "true");
      Object.assign(el.style, {
        position: "fixed",
        top: "0",
        left: "0",
        zIndex: "0",
        margin: "0",
        pointerEvents: "none",
        whiteSpace: "pre",
        fontFamily: "var(--font-mono)",
        lineHeight: "1",
        letterSpacing: "0.05em",
        fontWeight: "700",
        willChange: "transform",
        fontSize: `${(s.font * k).toFixed(1)}px`,
        opacity: String(opacity * s.op),
      });
      host.appendChild(el);
      return {
        el,
        A: i * 1.3,
        B: i * 0.7,
        dA: 0.03 + i * 0.006,
        dB: 0.02 + i * 0.004,
        px: s.fx * window.innerWidth,
        py: s.fy * window.innerHeight,
        vx: s.vx,
        vy: s.vy,
      };
    });

    function build(r) {
      const b = new Array(COLS * ROWS).fill(" ");
      const z = new Array(COLS * ROWS).fill(0);
      const cA = Math.cos(r.A),
        sA = Math.sin(r.A);
      const cB = Math.cos(r.B),
        sB = Math.sin(r.B);
      for (let theta = 0; theta < 6.283; theta += 0.07) {
        const ct = Math.cos(theta),
          st = Math.sin(theta);
        for (let phi = 0; phi < 6.283; phi += 0.03) {
          const cp = Math.cos(phi),
            sp = Math.sin(phi);
          const circleX = R2 + R1 * ct;
          const circleY = R1 * st;
          const x = circleX * (cB * cp + sA * sB * sp) - circleY * cA * sB;
          const y = circleX * (sB * cp - sA * cB * sp) + circleY * cA * cB;
          const ooz = 1 / (5 + cA * circleX * sp + circleY * sA);
          const xp = Math.floor(COLS / 2 + 0.46 * COLS * ooz * x);
          const yp = Math.floor(ROWS / 2 - 0.23 * COLS * ooz * y);
          const L =
            cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);
          if (yp >= 0 && yp < ROWS && xp >= 0 && xp < COLS) {
            const idx = xp + COLS * yp;
            if (ooz > z[idx]) {
              z[idx] = ooz;
              const lum = L > 0 ? L : 0;
              b[idx] = chars[Math.min(chars.length - 1, Math.floor(lum * 8))];
            }
          }
        }
      }
      let out = "";
      for (let row = 0; row < ROWS; row++)
        out += b.slice(row * COLS, row * COLS + COLS).join("") + "\n";
      r.el.textContent = out;
    }

    if (reduced) {
      rings.forEach((r) => {
        build(r);
        const w = r.el.offsetWidth,
          h = r.el.offsetHeight;
        const x = Math.min(Math.max(r.px, 0), Math.max(0, window.innerWidth - w));
        const y = Math.min(Math.max(r.py, 0), Math.max(0, window.innerHeight - h));
        r.el.style.transform = `translate(${x}px,${y}px)`;
      });
      return () => rings.forEach((r) => r.el.remove());
    }

    let raf,
      last = 0;
    function loop(now) {
      if (now - last > 40) {
        last = now;
        for (const r of rings) {
          build(r);
          const w = r.el.offsetWidth,
            h = r.el.offsetHeight;
          const maxX = window.innerWidth - w,
            maxY = window.innerHeight - h;
          r.px += r.vx;
          r.py += r.vy;
          if (r.px <= 0) {
            r.px = 0;
            r.vx = Math.abs(r.vx);
          } else if (r.px >= maxX) {
            r.px = maxX;
            r.vx = -Math.abs(r.vx);
          }
          if (r.py <= 0) {
            r.py = 0;
            r.vy = Math.abs(r.vy);
          } else if (r.py >= maxY) {
            r.py = maxY;
            r.vy = -Math.abs(r.vy);
          }
          r.el.style.transform = `translate(${r.px}px,${r.py}px)`;
          r.A += r.dA;
          r.B += r.dB;
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      rings.forEach((r) => r.el.remove());
    };
  }, [reduced, count, opacity]);

  return <div ref={hostRef} aria-hidden="true" />;
}
