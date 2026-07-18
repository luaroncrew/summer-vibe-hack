import { Link } from "react-router-dom";
import catGif from "../assets/cat.gif";

// Thin header over the grid, in dark ink: the cat on the left, the wordmark in
// the middle, and the live count + nav on the right.
export default function Header({ count }) {
  return (
    <header className="relative z-10 flex items-center gap-4 border-b border-line bg-ink-2 px-5 py-1.5 sm:px-7">
      <div className="flex flex-1 items-center">
        {/* negative margins keep the cat full-size without inflating the bar */}
        <img
          src={catGif}
          alt="le chat"
          className="-my-3 h-14 w-auto invert mix-blend-screen sm:h-16"
        />
      </div>

      <span className="text-[15px] font-bold tracking-tight text-cream sm:text-[17px]">
        the wall
      </span>

      <div className="flex flex-1 items-center justify-end gap-2.5 text-[11px] text-sand">
        <span className="hidden items-center gap-1.5 sm:flex">
          <b className="font-semibold text-cream">{count == null ? "…" : count}</b>
          on the wall
        </span>
        <Link to="/signup" className={NAV}>+ add project</Link>
        <Link to="/edit" className={NAV}>edit</Link>
      </div>
    </header>
  );
}

const NAV =
  "border border-line px-2.5 py-1 text-[11px] font-medium text-cream no-underline transition-colors hover:border-flame-orange hover:text-flame-orange";
