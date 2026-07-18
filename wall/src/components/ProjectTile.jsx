import { Link } from "react-router-dom";
import { coverFor } from "../lib/covers.js";
import { blurb } from "../lib/motifs.js";

// One project, one rectangle. The cover image fills the tile in full color with
// the heading and its description over it, both always visible (no hover
// needed). Tiles share a single border (no gaps).
export default function ProjectTile({ project, index }) {
  const cover = coverFor(project);
  const line = blurb(project.description);
  const emojis = (project.emojis ?? "").trim();

  return (
    <Link
      to={`/p/${project.id}`}
      aria-label={project.name}
      className="group relative isolate block min-h-0 min-w-0 overflow-hidden border-b border-r border-line no-underline tile-in"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {/* cover image — full color, always */}
      <img
        src={cover}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />

      {/* legibility scrim for the text */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background:
            "linear-gradient(to top, rgba(10,7,4,0.92), rgba(10,7,4,0.35) 45%, transparent)",
        }}
      />

      {/* heading + description, always visible */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        {emojis && (
          <div className="mb-1 text-[15px] leading-none drop-shadow-sm">{emojis}</div>
        )}
        <h2 className="truncate text-[15px] font-semibold text-cream drop-shadow-sm sm:text-[16px]">
          {project.name}
        </h2>
        {line && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-sand drop-shadow-sm">
            {line}
          </p>
        )}
      </div>
    </Link>
  );
}
