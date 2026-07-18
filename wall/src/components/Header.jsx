import { Link } from "react-router-dom";

// Thin header over the grid, in Mistral cream: the skill command on the left,
// the wordmark in the middle, and the live count + vote/edit nav on the right.
export default function Header({ count }) {
  return (
    <header className="relative z-10 flex items-center gap-4 bg-[#fff8e0] px-5 py-3 sm:px-7">
      <div className="flex flex-1 items-baseline">
        <code className="text-[12px] font-semibold text-[#fa520f] sm:text-[13px]">
          /summer-vibe
        </code>
      </div>

      <span className="text-[15px] font-bold tracking-tight text-[#1f1f1f] sm:text-[17px]">
        the wall
      </span>

      <div className="flex flex-1 items-center justify-end gap-2.5 text-[11px] text-[#8a7a63]">
        <span className="hidden items-center gap-1.5 sm:flex">
          <b className="font-semibold text-[#1f1f1f]">{count == null ? "…" : count}</b>
          on the wall
        </span>
        <Link to="/vote" className={NAV}>vote</Link>
        <Link to="/edit" className={NAV}>edit</Link>
      </div>
    </header>
  );
}

const NAV =
  "border border-[#e7d9b3] px-2.5 py-1 text-[11px] font-medium text-[#1f1f1f] no-underline transition-colors hover:border-[#fa520f] hover:text-[#fa520f]";
