import ProjectTile from "./ProjectTile.jsx";
import EmptyTile from "./EmptyTile.jsx";

// Three across. The first three rows fill the screen; more projects flow into
// further rows below and scroll. Always at least nine cells so the opening view
// is full, and the last row is padded with open slots.
export default function Wall({ projects, rowH }) {
  const count = Math.max(9, Math.ceil(projects.length / 3) * 3);
  const cells = Array.from({ length: count }, (_, i) => projects[i] ?? null);

  // exact row height from the measured scroll area; fall back before measure
  const autoRows = rowH ? `${rowH}px` : "calc((100svh - 48px) / 3)";

  return (
    <div
      className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-3"
      style={{ gridAutoRows: autoRows }}
    >
      {cells.map((project, i) =>
        project ? (
          <ProjectTile key={project.id} project={project} index={i} />
        ) : (
          <EmptyTile key={`empty-${i}`} index={i} />
        )
      )}
    </div>
  );
}
