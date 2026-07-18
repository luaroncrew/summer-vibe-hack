import { motifByIndex } from "../lib/motifs.js";

// Boilerplate for an open slot. Real projects show a cover image; open spots
// show an ascii illustration and tell the next builder how to claim the tile.
export default function EmptyTile({ index }) {
  const motif = motifByIndex(index);

  return (
    <div
      className="tile-in group relative flex min-h-0 min-w-0 flex-col items-center justify-center gap-3 overflow-hidden border-b border-r border-line bg-ink-2/30 p-4 text-center"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <pre className="flame-text m-0 text-[11px] leading-[1.2] opacity-45 transition-opacity duration-200 group-hover:opacity-70 sm:text-[12px]">
        {motif.join("\n")}
      </pre>
      <div>
        <p className="text-[12px] text-sand">spot open</p>
        <p className="mt-1 text-[10px] text-ink-soft">
          run <code className="text-flame-orange">/summer-vibe</code>
        </p>
      </div>
    </div>
  );
}
