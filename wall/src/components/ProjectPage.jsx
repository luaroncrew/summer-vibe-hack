import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AsciiBackdrop from "./ascii/AsciiBackdrop.jsx";
import { fetchProject } from "../api.js";
import { VOTING } from "../lib/flags.js";
import { coverFor } from "../lib/covers.js";
import { blurb } from "../lib/motifs.js";
import {
  twitterUrl,
  twitterLabel,
  linkedinUrl,
  githubUrl,
  safeUrl,
} from "../lib/links.js";

// The project page: a template filled from the submission, with a slot left
// for the ai-generated write-up that gets produced later.
export default function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setProject(null);
    setError(null);
    fetchProject(id)
      .then((d) => alive && setProject(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="relative min-h-full">
      <AsciiBackdrop rings={14} ringOpacity={0.5} />

      <div className="relative z-10 mx-auto flex min-h-full max-w-3xl flex-col px-4 py-5 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-block text-[12px] text-ink-soft no-underline transition-colors hover:text-flame-orange"
          >
            ← the wall
          </Link>
          <div className="flex items-center gap-2">
            {VOTING && (
            <Link
              to="/vote"
              className="border border-line px-2.5 py-1 text-[11px] text-ink-soft no-underline transition-colors hover:border-flame-orange hover:text-flame-orange"
            >
              vote
            </Link>
            )}
            <Link
              to="/edit"
              className="border border-line px-2.5 py-1 text-[11px] text-ink-soft no-underline transition-colors hover:border-flame-orange hover:text-flame-orange"
            >
              edit this page
            </Link>
          </div>
        </div>

        {error ? (
          <Panel>
            <p className="text-[15px] font-semibold text-cream">
              {error === "not-found" ? "no project here" : "could not load this"}
            </p>
            <p className="mt-1 text-[12px] text-ink-soft">
              {error === "not-found"
                ? "this tile may have been removed. head back to the wall."
                : "the wall server did not answer. try again in a moment."}
            </p>
          </Panel>
        ) : !project ? (
          <Panel>
            <p className="text-[13px] text-ink-soft">loading…</p>
          </Panel>
        ) : (
          <Loaded project={project} />
        )}
      </div>
    </div>
  );
}

function Loaded({ project }) {
  const cover = coverFor(project);
  const tagline = blurb(project.description, 120);
  const joined = fmtDate(project.createdAt);
  const members = project.members ?? [];
  const emojis = (project.emojis ?? "").trim();
  // every url here is submitter-controlled -> safeUrl allows http/https only
  const links = [
    { href: safeUrl(project.demoUrl), label: "open demo" },
    { href: githubUrl(project.githubUrl), label: "github" },
    { href: safeUrl(project.videoUrl), label: "demo video" },
    { href: safeUrl(project.deckUrl), label: "pitch deck" },
  ].filter((l) => l.href);

  return (
    <article className="flex flex-col gap-5">
      {/* hero: full-color cover with the name over it */}
      <header className="relative isolate overflow-hidden border border-line">
        <img
          src={cover}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(10,7,4,0.94), rgba(10,7,4,0.55) 55%, rgba(10,7,4,0.25))",
          }}
        />
        <div className="relative p-6 pt-24 sm:p-8 sm:pt-32">
          <p className="text-[11px] text-sand">summer vibe hack · build</p>
          <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3 text-[26px] font-bold leading-tight tracking-tight text-cream sm:text-[34px]">
            {project.name}
            {emojis && <span className="text-[22px] sm:text-[28px]">{emojis}</span>}
          </h1>
          {tagline && (
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-sand">
              {tagline}
            </p>
          )}
          {links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {links.map((l) => (
                <LinkChip key={l.label} href={l.href} label={l.label} />
              ))}
            </div>
          )}
        </div>
      </header>

      {/* what they're building */}
      <Section label="what they're building">
        <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-cream">
          {project.description || "no description yet."}
        </p>
      </Section>

      {/* the team + their socials */}
      {members.length > 0 && (
        <Section label={members.length > 1 ? "team" : "builder"}>
          <ul className="flex flex-col gap-3">
            {members.map((m, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-3 border-b border-line/60 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-[13.5px] text-cream">{m.name}</span>
                <span className="flex flex-wrap gap-2">
                  {m.twitter && (
                    <LinkChip
                      href={twitterUrl(m.twitter)}
                      label={twitterLabel(m.twitter)}
                      small
                    />
                  )}
                  {m.linkedin && (
                    <LinkChip
                      href={linkedinUrl(m.linkedin)}
                      label="linkedin"
                      small
                    />
                  )}
                  {m.github && (
                    <LinkChip href={githubUrl(m.github)} label="github" small />
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* slot for the model-written overview, filled in later */}
      <Section label="generated overview">
        <div className="flex items-start gap-3">
          <span className="mt-[3px] inline-block h-[7px] w-[7px] shrink-0 bg-flame-coral" />
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            a longer write-up of this project, drafted by a model from the
            details above, will land here soon.
          </p>
        </div>
      </Section>

      <p className="pb-6 text-[11px] text-ink-soft">on the wall since {joined}</p>
    </article>
  );
}

function Section({ label, children }) {
  return (
    <section className="border border-line bg-ink-2/60 p-6 backdrop-blur-[2px] sm:p-7">
      <h3 className="mb-3 text-[11px] tracking-wide text-flame-orange">
        {label}
      </h3>
      {children}
    </section>
  );
}

function LinkChip({ href, label, small }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`border border-line text-cream no-underline transition-colors hover:border-flame-orange hover:text-flame-orange ${
        small ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]"
      }`}
    >
      {label} ↗
    </a>
  );
}

function Panel({ children }) {
  return (
    <div className="border border-line bg-ink-2/70 p-6 backdrop-blur-[2px]">
      {children}
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "recently";
  const d = new Date(iso);
  if (isNaN(d)) return "recently";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
