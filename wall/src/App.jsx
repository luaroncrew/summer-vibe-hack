import { useEffect, useLayoutEffect, useRef, useState } from "react";
import AsciiBackdrop from "./components/ascii/AsciiBackdrop.jsx";
import Header from "./components/Header.jsx";
import Wall from "./components/Wall.jsx";
import { fetchProjects } from "./api.js";

export default function App() {
  const [projects, setProjects] = useState(null); // null = loading
  const [error, setError] = useState(null);

  // Measure the scroll area so the first three rows fill it exactly; extra
  // rows spill below and scroll.
  const mainRef = useRef(null);
  const [rowH, setRowH] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchProjects()
      .then((data) => alive && setProjects(data))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const measure = () => setRowH(el.clientHeight / 3);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = projects?.length ?? 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <AsciiBackdrop />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <Header count={projects ? total : null} />
        <div className="flame-rule h-px w-full opacity-60" />

        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <StateCard
              title="the wall is quiet"
              body="could not reach the wall server. check that the api is running and try again."
            />
          ) : projects == null ? (
            <StateCard title="loading the wall" body="pulling the latest builds…" />
          ) : (
            <Wall projects={projects} rowH={rowH} />
          )}
        </main>
      </div>
    </div>
  );
}

function StateCard({ title, body }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="border border-line bg-ink-2/70 px-6 py-5 text-center backdrop-blur-[2px]">
        <p className="text-[14px] font-semibold text-cream">{title}</p>
        <p className="mt-1 text-[12px] text-ink-soft">{body}</p>
      </div>
    </div>
  );
}
