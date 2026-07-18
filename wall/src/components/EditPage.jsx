import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AsciiBackdrop from "./ascii/AsciiBackdrop.jsx";
import {
  lookupCode,
  resolveLink,
  saveSubmission,
  createShareLink,
  uploadPhotos,
} from "../api.js";

// Edit a project on the wall. Two ways in: a team enters their 6-digit code,
// or a teammate opens a signed link (?token=...) that skips the code. Either
// way you can change everything, then mint a link to hand to a teammate.

const EMPTY = {
  photos: [],
  name: "",
  description: "",
  emojis: "",
  imageUrl: "",
  demoUrl: "",
  videoUrl: "",
  githubUrl: "",
  deckUrl: "",
  members: [{ name: "", twitter: "", linkedin: "", github: "" }],
};

function fromSubmission(s) {
  return {
    photos: s.photos ?? [],
    name: s.name ?? "",
    description: s.description ?? "",
    emojis: s.emojis ?? "",
    imageUrl: s.imageUrl ?? "",
    demoUrl: s.demoUrl ?? "",
    videoUrl: s.videoUrl ?? "",
    githubUrl: s.githubUrl ?? "",
    deckUrl: s.deckUrl ?? "",
    members: s.members?.length
      ? s.members.map((m) => ({
          name: m.name ?? "",
          twitter: m.twitter ?? "",
          linkedin: m.linkedin ?? "",
          github: m.github ?? "",
        }))
      : [{ name: "", twitter: "", linkedin: "", github: "" }],
  };
}

export default function EditPage() {
  const [params] = useSearchParams();
  const token = params.get("token");

  // phase: gate (enter code) | loading | form | saved
  const [phase, setPhase] = useState(token ? "loading" : "gate");
  const [auth, setAuth] = useState(token ? { token } : null);
  const [existing, setExisting] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);

  // a signed link opens straight into the form
  useEffect(() => {
    if (!token) return;
    let alive = true;
    resolveLink(token)
      .then((sub) => {
        if (!alive) return;
        setValues(fromSubmission(sub));
        setSavedId(sub.id);
        setExisting(true);
        setPhase("form");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setPhase("gate"); // fall back to code entry
        setAuth(null);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <div className="relative min-h-full">
      <AsciiBackdrop />
      <div className="relative z-10 mx-auto flex min-h-full max-w-2xl flex-col px-4 py-5 sm:px-6">
        <Link
          to="/"
          className="mb-6 inline-block text-[12px] text-ink-soft no-underline transition-colors hover:text-flame-orange"
        >
          ← the wall
        </Link>

        {phase === "gate" && (
          <CodeGate
            error={error}
            onValid={({ code, submission }) => {
              setAuth({ code });
              setError(null);
              if (submission) {
                setValues(fromSubmission(submission));
                setSavedId(submission.id);
                setExisting(true);
              } else {
                setValues(EMPTY);
                setExisting(false);
              }
              setPhase("form");
            }}
          />
        )}

        {phase === "loading" && (
          <Panel>
            <p className="text-[13px] text-ink-soft">opening your edit link…</p>
          </Panel>
        )}

        {phase === "form" && (
          <EditForm
            values={values}
            setValues={setValues}
            auth={auth}
            existing={existing}
            onSaved={(id) => {
              setSavedId(id);
              setExisting(true);
              setPhase("saved");
            }}
          />
        )}

        {phase === "saved" && (
          <Saved id={savedId} auth={auth} onKeepEditing={() => setPhase("form")} />
        )}
      </div>
    </div>
  );
}

/* --- code gate ----------------------------------------------------------- */

function CodeGate({ onValid, error }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(error ?? null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { submission } = await lookupCode(code.trim());
      onValid({ code: code.trim(), submission });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h1 className="text-[24px] font-bold tracking-tight text-cream sm:text-[28px]">
        edit your project
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        enter your team's 6-digit code to open your page. don't have one? run{" "}
        <code className="text-flame-orange">/summer-vibe</code> in vibe to get on
        the wall first.
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
        {busy ? "checking…" : "continue"}
      </button>
    </form>
  );
}

/* --- the editor ---------------------------------------------------------- */

function EditForm({ values, setValues, auth, existing, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoErr, setPhotoErr] = useState(null);

  const pickPhotos = (e) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 3) {
      setPhotoErr("3 photos max — only the first 3 will be uploaded");
      setPhotoFiles(files.slice(0, 3));
    } else {
      setPhotoErr(null);
      setPhotoFiles(files);
    }
  };

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const setMember = (i, k) => (e) =>
    setValues((v) => {
      const members = v.members.map((m, j) =>
        j === i ? { ...m, [k]: e.target.value } : m
      );
      return { ...v, members };
    });

  const addMember = () =>
    setValues((v) => ({
      ...v,
      members: [...v.members, { name: "", twitter: "", linkedin: "", github: "" }],
    }));

  const removeMember = (i) =>
    setValues((v) => ({ ...v, members: v.members.filter((_, j) => j !== i) }));

  const namedMembers = values.members.filter((m) => m.name.trim().length);
  const valid =
    values.name.trim().length &&
    values.description.trim().length &&
    namedMembers.length >= 1;

  const save = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setErr(null);
    setSaving(true);
    try {
      const result = await saveSubmission({ auth, values, existing });
      if (photoFiles.length) await uploadPhotos(auth, photoFiles);
      onSaved(existing ? result.id : result.id);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <header>
        <h1 className="text-[24px] font-bold tracking-tight text-cream sm:text-[28px]">
          {existing ? "edit your project" : "put your project on the wall"}
        </h1>
        <p className="mt-1 text-[12px] text-ink-soft">
          {auth?.token
            ? "you opened a shared edit link — changes are saved to the team page."
            : "everything here is editable. changes go live on the wall right away."}
        </p>
      </header>

      <Section title="the basics">
        <Field label="emojis" hint="a few emoji shown by the name, e.g. 🌊🔥🏄">
          <input value={values.emojis} onChange={set("emojis")} className={INPUT} placeholder="🌊🔥🏄" />
        </Field>
        <Field label="project name" required>
          <input value={values.name} onChange={set("name")} className={INPUT} placeholder="tide pool" />
        </Field>
        <Field label="description" required hint="what you're building, in a couple of sentences">
          <textarea value={values.description} onChange={set("description")} rows={4} className={INPUT} placeholder="local-first notes that sync over wifi only…" />
        </Field>
      </Section>

      <Section title="cover + links">
        <Field
          label="photos (up to 3)"
          hint="uploaded from your device — the first one becomes the tile cover; a new upload replaces the current set"
        >
          {values.photos?.length > 0 && photoFiles.length === 0 && (
            <div className="mb-2 flex gap-2">
              {values.photos.map((src, i) => (
                <img key={i} src={src} alt={`photo ${i + 1}`} className="h-14 w-20 border border-line object-cover" />
              ))}
            </div>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            onChange={pickPhotos}
            className="block w-full text-[12px] text-ink-soft file:mr-3 file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-[11px] file:text-cream file:transition-colors hover:file:border-flame-orange"
          />
          {photoErr && <span className="mt-1 block text-[11px] text-flame-coral">{photoErr}</span>}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="live demo"><input value={values.demoUrl} onChange={set("demoUrl")} className={INPUT} placeholder="https://…" /></Field>
          <Field label="github repo"><input value={values.githubUrl} onChange={set("githubUrl")} className={INPUT} placeholder="github.com/…" /></Field>
          <Field label="demo video"><input value={values.videoUrl} onChange={set("videoUrl")} className={INPUT} placeholder="https://…" /></Field>
          <Field label="pitch deck"><input value={values.deckUrl} onChange={set("deckUrl")} className={INPUT} placeholder="https://…" /></Field>
        </div>
      </Section>

      <Section
        title="team"
        action={
          <button type="button" onClick={addMember} className={MINOR}>
            + add member
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          {values.members.map((m, i) => (
            <div key={i} className="border border-line bg-ink-3/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] text-ink-soft">member {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeMember(i)}
                  disabled={values.members.length <= 1}
                  className="text-[11px] text-ink-soft transition-colors hover:text-flame-coral disabled:opacity-30 disabled:hover:text-ink-soft"
                >
                  remove
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={m.name} onChange={setMember(i, "name")} className={INPUT} placeholder="name" />
                <input value={m.twitter} onChange={setMember(i, "twitter")} className={INPUT} placeholder="twitter / x" />
                <input value={m.linkedin} onChange={setMember(i, "linkedin")} className={INPUT} placeholder="linkedin" />
                <input value={m.github} onChange={setMember(i, "github")} className={INPUT} placeholder="github" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {err && <p className="text-[12px] text-flame-coral">{err}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={!valid || saving} className={PRIMARY}>
          {saving ? "saving…" : existing ? "save changes" : "put on the wall"}
        </button>
        {!valid && (
          <span className="text-[11px] text-ink-soft">
            name, description, and one member are required
          </span>
        )}
      </div>

      <ShareLink auth={auth} disabled={!existing} />
    </form>
  );
}

/* --- teammate share link ------------------------------------------------- */

function ShareLink({ auth, disabled }) {
  const [urlText, setUrlText] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(false);

  const make = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { token } = await createShareLink(auth);
      // build the link for wherever this wall actually lives
      const base = `${window.location.origin}${window.location.pathname}`;
      setUrlText(`${base}#/edit?token=${token}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(urlText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className="border border-dashed border-line bg-ink-2/40 p-4">
      <h3 className="text-[11px] tracking-wide text-flame-orange">
        invite a teammate
      </h3>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
        create a link that lets a teammate edit this page without the code. it
        works for 30 days.
      </p>

      {disabled ? (
        <p className="mt-3 text-[11px] text-ink-soft">
          save the project first, then you can share an edit link.
        </p>
      ) : !urlText ? (
        <button type="button" onClick={make} disabled={busy} className={`${MINOR} mt-3`}>
          {busy ? "creating…" : "create edit link"}
        </button>
      ) : (
        <div className="mt-3 flex items-stretch gap-2">
          <input readOnly value={urlText} className={`${INPUT} text-[11px]`} onFocus={(e) => e.target.select()} />
          <button type="button" onClick={copy} className={MINOR}>
            {copied ? "copied" : "copy"}
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-[12px] text-flame-coral">{err}</p>}
    </div>
  );
}

/* --- saved --------------------------------------------------------------- */

function Saved({ id, auth, onKeepEditing }) {
  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <p className="text-[15px] font-semibold text-cream">saved to the wall</p>
        <p className="mt-1 text-[12px] text-ink-soft">
          your changes are live.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {id && (
            <Link to={`/p/${id}`} className={PRIMARY_LINK}>
              view the page ↗
            </Link>
          )}
          <button type="button" onClick={onKeepEditing} className={GHOST}>
            keep editing
          </button>
        </div>
      </Panel>
      <ShareLink auth={auth} disabled={false} />
    </div>
  );
}

/* --- small building blocks ---------------------------------------------- */

function Section({ title, action, children }) {
  return (
    <section className="border border-line bg-ink-2/60 p-5 backdrop-blur-[2px] sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] tracking-wide text-flame-orange">{title}</h2>
        {action}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className={LABEL}>
        {label}
        {required && <span className="text-flame-coral"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10.5px] text-ink-soft">{hint}</span>}
    </label>
  );
}

function Panel({ children }) {
  return (
    <div className="border border-line bg-ink-2/70 p-6 backdrop-blur-[2px]">
      {children}
    </div>
  );
}

const LABEL = "mb-1.5 block text-[11px] text-sand";
const INPUT =
  "w-full border border-line bg-ink-3/60 px-3 py-2 text-[13px] text-cream placeholder:text-ink-soft/60 outline-none transition-colors focus:border-flame-orange";
const PRIMARY =
  "border border-flame-orange bg-flame-orange px-5 py-2.5 text-[13px] font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-40";
const PRIMARY_LINK =
  "border border-flame-orange bg-flame-orange px-4 py-2 text-[12px] font-semibold text-ink no-underline transition-opacity hover:opacity-90";
const GHOST =
  "border border-line px-4 py-2 text-[12px] text-cream transition-colors hover:border-flame-orange";
const MINOR =
  "border border-line px-3 py-1.5 text-[11px] text-cream transition-colors hover:border-flame-orange";
