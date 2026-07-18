import { Link } from "react-router-dom";
import { coverFor } from "../lib/covers.js";
import { blurb } from "../lib/motifs.js";

// One project, one rectangle. The cover image fills the tile with the heading
// over it. Off-cursor the image is monochrome in mistral colors; on hover it
// takes its real colors. Tiles share a single border (no gaps).
export default function ProjectTile({ project, index }) {
  const cover = coverFor(project);
  const line = blurb(project.description);

  return (
    <Link
      to={`/p/${project.id}`}
      aria-label={project.name}
      className="group relative isolate block min-h-0 min-w-0 overflow-hidden border-b border-r border-line no-underline tile-in"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {/* cover image */}
      <img
        src={cover}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />

      {/* mistral monochrome veil — fades out on hover to reveal real colors */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-100 transition-opacity duration-300 group-hover:opacity-0"
        style={{
          background:
            "linear-gradient(150deg, #ffc61a, #ff7a00 52%, #d81e05)",
          mixBlendMode: "color",
        }}
      />
      {/* a touch of desaturation under the veil so the off state is fully mono */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ink/25 opacity-100 transition-opacity duration-300 group-hover:opacity-0"
      />

      {/* legibility scrim for the heading */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background:
            "linear-gradient(to top, rgba(10,7,4,0.92), rgba(10,7,4,0.35) 45%, transparent)",
        }}
      />

      {/* heading */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h2 className="truncate text-[15px] font-semibold text-cream drop-shadow-sm sm:text-[16px]">
          {project.name}
        </h2>
        {line && (
          <p className="mt-1 max-h-0 overflow-hidden text-[11px] leading-snug text-sand opacity-0 transition-all duration-300 group-hover:max-h-12 group-hover:opacity-100">
            {line}
          </p>
        )}
      </div>

      {/* heat line on hover */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 flame-rule transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}
