import { installUrl } from "../api.js";
import { motifByIndex } from "../lib/motifs.js";

// Boilerplate for an open slot. Real projects show a cover image; open spots
// show an ascii illustration and link the next builder to the install page.
export default function EmptyTile({ index }) {
  const motif = motifByIndex(index);

  return (
    <a
      href={installUrl}
      className="tile-in group relative flex min-h-0 min-w-0 flex-col items-center justify-center gap-3 overflow-hidden border-b border-r border-line bg-ink-2/30 p-4 text-center no-underline"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <pre className="flame-text m-0 text-[11px] leading-[1.2] opacity-60 transition-opacity duration-200 group-hover:opacity-90 sm:text-[12px]">
        {motif.join("\n")}
      </pre>
      <div>
        <p className="text-[12px] text-sand">spot open</p>
        <p className="mt-1 text-[10px] text-ink-soft">
          run <code className="text-flame-orange">/summer-vibe</code>
        </p>
        <p className="mt-1 text-[10px] font-semibold text-flame-orange underline-offset-2 group-hover:underline">
          install the skill →
        </p>
      </div>
    </a>
  );
}
