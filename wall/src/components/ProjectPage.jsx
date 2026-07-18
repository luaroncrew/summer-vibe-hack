import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AsciiBackdrop from "./ascii/AsciiBackdrop.jsx";
import { fetchProject, fetchProjects } from "../api.js";
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
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [ids, setIds] = useState([]);
  const [lightbox, setLightbox] = useState(null); // photo index, or null

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

  // the wall's ordering, so ←/→ walks the projects in the same order as the grid
  useEffect(() => {
    let alive = true;
    fetchProjects()
      .then((list) => alive && setIds(list.map((p) => p.id)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const idx = ids.indexOf(Number(id));
  const prevId = idx > 0 ? ids[idx - 1] : null;
  const nextId = idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;

  useEffect(() => {
    const onKey = (e) => {
      if (lightbox != null) return; // the lightbox owns the keys while open
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === "ArrowLeft" && prevId != null) navigate(`/p/${prevId}`);
      if (e.key === "ArrowRight" && nextId != null) navigate(`/p/${nextId}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevId, nextId, navigate, lightbox]);

  // close the lightbox when switching projects
  useEffect(() => setLightbox(null), [id]);

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
            <span className="flex items-center gap-1">
              <NavArrow id={prevId} dir="prev" />
              <NavArrow id={nextId} dir="next" />
            </span>
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
          <Loaded project={project} lightbox={lightbox} setLightbox={setLightbox} />
        )}
      </div>
    </div>
  );
}

function Loaded({ project, lightbox, setLightbox }) {
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

      {/* uploaded photos */}
      {project.photos?.length > 0 && (
        <Section label="photos">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {project.photos.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(i)}
                className="cursor-zoom-in border-0 bg-transparent p-0"
                aria-label={`view photo ${i + 1} full screen`}
              >
                <img
                  src={src}
                  alt={`${project.name} photo ${i + 1}`}
                  className="aspect-[4/3] w-full border border-line object-cover transition-opacity hover:opacity-90"
                />
              </button>
            ))}
          </div>
        </Section>
      )}

      {lightbox != null && (
        <Lightbox
          photos={project.photos}
          index={lightbox}
          setIndex={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}

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
                      icon={<XLogo />}
                      small
                    />
                  )}
                  {m.linkedin && (
                    <LinkChip
                      href={linkedinUrl(m.linkedin)}
                      label="linkedin"
                      icon={<LinkedInLogo />}
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

function LinkChip({ href, label, icon, small }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 border border-line text-cream no-underline transition-colors hover:border-flame-orange hover:text-flame-orange ${
        small ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]"
      }`}
    >
      {icon}
      {label} ↗
    </a>
  );
}

function Lightbox({ photos, index, setIndex, onClose }) {
  const prev = index > 0 ? index - 1 : null;
  const next = index < photos.length - 1 ? index + 1 : null;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && prev != null) setIndex(prev);
      if (e.key === "ArrowRight" && next != null) setIndex(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, setIndex, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <img
        src={photos[index]}
        alt={`photo ${index + 1} of ${photos.length}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full object-contain"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="close"
        className="absolute right-4 top-4 border border-line bg-black/50 px-3 py-1.5 text-[14px] text-cream transition-colors hover:border-flame-orange hover:text-flame-orange"
      >
        ✕
      </button>
      {prev != null && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex(prev); }}
          aria-label="previous photo"
          className="absolute left-4 top-1/2 -translate-y-1/2 border border-line bg-black/50 px-3 py-2 text-[16px] text-cream transition-colors hover:border-flame-orange hover:text-flame-orange"
        >
          ←
        </button>
      )}
      {next != null && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex(next); }}
          aria-label="next photo"
          className="absolute right-4 top-1/2 -translate-y-1/2 border border-line bg-black/50 px-3 py-2 text-[16px] text-cream transition-colors hover:border-flame-orange hover:text-flame-orange"
        >
          →
        </button>
      )}
      {photos.length > 1 && (
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px] text-sand">
          {index + 1} / {photos.length}
        </span>
      )}
    </div>
  );
}

function NavArrow({ id, dir }) {
  const glyph = dir === "prev" ? "←" : "→";
  const title = dir === "prev" ? "previous project (←)" : "next project (→)";
  if (id == null) {
    return (
      <span className="border border-line/40 px-2.5 py-1 text-[11px] text-ink-soft/40 select-none">
        {glyph}
      </span>
    );
  }
  return (
    <Link
      to={`/p/${id}`}
      title={title}
      aria-label={title}
      className="border border-line px-2.5 py-1 text-[11px] text-ink-soft no-underline transition-colors hover:border-flame-orange hover:text-flame-orange"
    >
      {glyph}
    </Link>
  );
}

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-[11px] w-[11px] shrink-0">
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.23l-4.88-6.38L6.5 22H3.34l7.24-8.28L2.4 2h6.39l4.41 5.83L18.9 2Zm-1.09 18.14h1.72L7.86 3.77H6.01l11.8 16.37Z" />
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-[11px] w-[11px] shrink-0">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
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
