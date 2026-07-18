// Thin header over the grid: the wordmark, the live count, and the one line a
// builder needs to get their own project up here.
export default function Header({ count }) {
  return (
    <header className="relative z-10 flex items-center gap-4 px-5 py-3 sm:px-7">
      <div className="flex flex-1 items-baseline">
        <span className="hidden text-[11px] text-ink-soft sm:inline">
          summer vibe hack
        </span>
      </div>

      <span className="text-[15px] font-bold tracking-tight text-cream sm:text-[17px]">
        the wall
      </span>

      <div className="flex flex-1 items-center justify-end gap-4 text-[11px] text-ink-soft sm:gap-5">
        <span className="flex items-center gap-2">
          <span className="inline-block h-[7px] w-[7px] bg-flame-coral" />
          <b className="font-semibold text-cream">
            {count == null ? "…" : count}
          </b>
          <span className="hidden sm:inline">on the wall</span>
        </span>
        <code className="hidden text-flame-orange md:inline">/summer-vibe</code>
      </div>
    </header>
  );
}
