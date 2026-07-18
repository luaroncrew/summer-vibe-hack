// Normalize the socials a builder typed into real, clickable links.
// People paste handles, @handles, or full urls — accept all three.
//
// Everything here is submitter-controlled, so every url we hand to an href is
// passed through safeUrl(): only http/https survive, so a `javascript:` or
// `data:` uri can never reach the dom.

export function safeUrl(u) {
  if (!u) return null;
  try {
    const parsed = new URL(String(u).trim(), window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

export function twitterUrl(raw) {
  if (!raw) return null;
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return safeUrl(v);
  const handle = v.replace(/^@/, "");
  return safeUrl(`https://x.com/${encodeURIComponent(handle)}`);
}

export function twitterLabel(raw) {
  if (!raw) return null;
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) {
    const m = v.match(/(?:x|twitter)\.com\/(@?[^/?#]+)/i);
    return m ? "@" + m[1].replace(/^@/, "") : v;
  }
  return "@" + v.replace(/^@/, "");
}

export function githubUrl(raw) {
  if (!raw) return null;
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return safeUrl(v);
  if (v.includes("github.com")) return safeUrl(`https://${v.replace(/^\/+/, "")}`);
  // a bare handle -> profile
  const handle = v.replace(/^@/, "").replace(/^\/+/, "");
  return safeUrl(`https://github.com/${encodeURIComponent(handle)}`);
}

export function linkedinUrl(raw) {
  if (!raw) return null;
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return safeUrl(v);
  if (v.includes("linkedin.com")) return safeUrl(`https://${v.replace(/^\/+/, "")}`);
  // treat a bare name/slug as an /in/ profile
  const slug = v.replace(/^\/+/, "").replace(/\s+/g, "-").toLowerCase();
  return safeUrl(`https://www.linkedin.com/in/${encodeURIComponent(slug)}`);
}
