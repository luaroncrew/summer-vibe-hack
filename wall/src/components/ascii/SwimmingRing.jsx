import { useEffect, useRef } from "react";
import { useReducedMotion } from "../../lib/useReducedMotion.js";

// The spa's swimming ring: a thin 3d ascii torus that drifts and bounces off
// the viewport edges. Ported from the landing page so the wall feels like the
// same world, then tuned darker and slower to sit behind the grid.
export default function SwimmingRing() {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const COLS = 44,
      ROWS = 22;
    const chars = ".,-~:;=!*#$@";
    const R1 = 0.5,
      R2 = 2; // thin tube, wide hole
    let A = 0,
      B = 0;

    function build() {
      const b = new Array(COLS * ROWS).fill(" ");
      const z = new Array(COLS * ROWS).fill(0);
      const cA = Math.cos(A),
        sA = Math.sin(A);
      const cB = Math.cos(B),
        sB = Math.sin(B);

      for (let theta = 0; theta < 6.283; theta += 0.06) {
        const ct = Math.cos(theta),
          st = Math.sin(theta);
        for (let phi = 0; phi < 6.283; phi += 0.02) {
          const cp = Math.cos(phi),
            sp = Math.sin(phi);
          const circleX = R2 + R1 * ct;
          const circleY = R1 * st;
          const x = circleX * (cB * cp + sA * sB * sp) - circleY * cA * sB;
          const y = circleX * (sB * cp - sA * cB * sp) + circleY * cA * cB;
          const z0 = 5 + cA * circleX * sp + circleY * sA;
          const ooz = 1 / z0;
          const xp = Math.floor(COLS / 2 + 0.46 * COLS * ooz * x);
          const yp = Math.floor(ROWS / 2 - 0.23 * COLS * ooz * y);
          const L =
            cp * ct * sB -
            cA * ct * sp -
            sA * st +
            cB * (cA * st - ct * sA * sp);
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
      for (let r = 0; r < ROWS; r++)
        out += b.slice(r * COLS, r * COLS + COLS).join("") + "\n";
      el.textContent = out;
    }

    if (reduced) {
      A = 0.9;
      B = 2.3;
      build();
      const w = el.offsetWidth,
        h = el.offsetHeight;
      el.style.transform = `translate(${(window.innerWidth - w) * 0.72}px,${
        (window.innerHeight - h) * 0.2
      }px)`;
      return;
    }

    let px = 80,
      py = 70,
      vx = 0.6,
      vy = 0.45;
    let raf,
      last = 0;

    function loop(now) {
      if (now - last > 55) {
        last = now;
        build();
        const w = el.offsetWidth,
          h = el.offsetHeight;
        const maxX = window.innerWidth - w,
          maxY = window.innerHeight - h;
        px += vx;
        py += vy;
        if (px <= 0) {
          px = 0;
          vx = Math.abs(vx);
        } else if (px >= maxX) {
          px = maxX;
          vx = -Math.abs(vx);
        }
        if (py <= 0) {
          py = 0;
          vy = Math.abs(vy);
        } else if (py >= maxY) {
          py = maxY;
          vy = -Math.abs(vy);
        }
        el.style.transform = `translate(${px}px,${py}px)`;
        A += 0.024;
        B += 0.012;
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
        fontSize: "clamp(8px, 1.3vw, 14px)",
        fontWeight: 700,
        letterSpacing: "0.05em",
        opacity: 0.22,
      }}
    />
  );
}
