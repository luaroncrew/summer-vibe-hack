import { useState } from "react";
import { Link } from "react-router-dom";
import AsciiBackdrop from "./ascii/AsciiBackdrop.jsx";
import { lookupCode, castVote, fetchProjects } from "../api.js";
import { coverFor } from "../lib/covers.js";

// Vote for the wall. A team enters its 6-digit code (so one code = one vote),
// then picks a project. A team can't vote for itself, and re-voting moves the
// single vote — the count never inflates.
export default function VotePage() {
  const [phase, setPhase] = useState("gate"); // gate | list
  const [code, setCode] = useState(null);
  const [ownId, setOwnId] = useState(null);
  const [votedFor, setVotedFor] = useState(null);
  const [projects, setProjects] = useState([]);

  const onValid = ({ code, submission, votedFor }) => {
    setCode(code);
    setOwnId(submission?.id ?? null);
    setVotedFor(votedFor ?? null);
    setPhase("list");
  };

  return (
    <div className="relative min-h-full">
      <AsciiBackdrop />
      <div className="relative z-10 mx-auto flex min-h-full max-w-4xl flex-col px-4 py-5 sm:px-6">
        <Link
          to="/"
          className="mb-6 inline-block text-[12px] text-ink-soft no-underline transition-colors hover:text-flame-orange"
        >
          ← the wall
        </Link>

        {phase === "gate" ? (
          <VoteGate onValid={onValid} setProjects={setProjects} />
        ) : (
          <VoteList
            code={code}
            ownId={ownId}
            votedFor={votedFor}
            setVotedFor={setVotedFor}
            projects={projects}
            setProjects={setProjects}
          />
        )}
      </div>
    </div>
  );
}

function VoteGate({ onValid, setProjects }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const [{ submission, votedFor }, list] = await Promise.all([
        lookupCode(code.trim()),
        fetchProjects(),
      ]);
      setProjects(list);
      onValid({ code: code.trim(), submission, votedFor });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h1 className="text-[24px] font-bold tracking-tight text-cream sm:text-[28px]">
        vote for the wall
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        one vote per team. enter your team's 6-digit code to cast it — you can
        change your pick any time, and you can't vote for your own project.
      </p>

      <div className="mt-6">
        <label className={LABEL}>team code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoFocus
          placeholder="123456"
          className={`${INPUT} tracking-[0.4em]`}
        />
      </div>

      {err && <p className="mt-3 text-[12px] text-flame-coral">{err}</p>}

      <button type="submit" disabled={code.length !== 6 || busy} className={`${PRIMARY} mt-5`}>
        {busy ? "checking…" : "start voting"}
      </button>
    </form>
  );
}

function VoteList({ code, ownId, votedFor, setVotedFor, projects, setProjects }) {
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState(null);

  const ranked = [...projects].sort(
    (a, b) => b.votes - a.votes || a.name.localeCompare(b.name)
  );
  const votedName = projects.find((p) => p.id === votedFor)?.name;

  const vote = async (id) => {
    setErr(null);
    setBusyId(id);
    try {
      await castVote(code, id);
      setVotedFor(id);
      // refresh counts so the previous pick's total drops too
      setProjects(await fetchProjects());
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-[24px] font-bold tracking-tight text-cream sm:text-[28px]">
          vote for the wall
        </h1>
        <p className="mt-1 text-[12px] text-ink-soft">
          {votedFor ? (
            <>
              you voted for <span className="text-flame-orange">{votedName}</span>.
              tap another to move your vote.
            </>
          ) : (
            "one vote per team. tap a project to cast it."
          )}
        </p>
      </header>

      {err && <p className="mb-4 text-[12px] text-flame-coral">{err}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ranked.map((p, i) => {
          const isOwn = p.id === ownId;
          const isVoted = p.id === votedFor;
          return (
            <div
              key={p.id}
              className={`flex flex-col border bg-ink-2/60 transition-colors ${
                isVoted ? "border-flame-orange" : "border-line"
              }`}
            >
              <div className="relative h-20 overflow-hidden">
                <img src={coverFor(p)} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(10,7,4,0.9), rgba(10,7,4,0.2))" }}
                />
                <span className="absolute left-2 top-2 text-[10px] text-sand">#{i + 1}</span>
                <div className="absolute inset-x-0 bottom-0 flex items-baseline gap-2 p-2.5">
                  {p.emojis && <span className="text-[13px] leading-none">{p.emojis}</span>}
                  <Link
                    to={`/p/${p.id}`}
                    className="truncate text-[13px] font-semibold text-cream no-underline hover:text-flame-orange"
                  >
                    {p.name}
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 p-3">
                <span className="text-[12px] text-ink-soft">
                  <b className="text-cream">{p.votes}</b> {p.votes === 1 ? "vote" : "votes"}
                </span>
                {isOwn ? (
                  <span className="border border-line px-2.5 py-1 text-[11px] text-ink-soft">
                    your team
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => vote(p.id)}
                    disabled={busyId != null}
                    className={
                      isVoted
                        ? "border border-flame-orange bg-flame-orange px-3 py-1 text-[11px] font-semibold text-ink"
                        : "border border-line px-3 py-1 text-[11px] text-cream transition-colors hover:border-flame-orange hover:text-flame-orange disabled:opacity-40"
                    }
                  >
                    {busyId === p.id ? "…" : isVoted ? "voted ✓" : "vote"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const LABEL = "mb-1.5 block text-[11px] text-sand";
const INPUT =
  "w-full border border-line bg-ink-3/60 px-3 py-2 text-[13px] text-cream placeholder:text-ink-soft/60 outline-none transition-colors focus:border-flame-orange";
const PRIMARY =
  "border border-flame-orange bg-flame-orange px-5 py-2.5 text-[13px] font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-40";
