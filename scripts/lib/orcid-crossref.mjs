const UA = "ferestrepoca.github.io/1.0 (mailto:ferestrepoca@unal.edu.co; personal site data pipeline)";

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchJson(url, { accept = "application/json", retries = 4 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: accept, "User-Agent": UA },
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = 1000 * (attempt + 1) ** 2;
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      await sleep(500 * (attempt + 1));
    }
  }
  throw lastErr;
}

export function normalizeDoi(doi) {
  if (!doi) return "";
  let d = String(doi).trim();
  d = d.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  d = d.replace(/^doi:/i, "");
  return d.toLowerCase();
}

export function slugName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "unknown";
}

export function stripAccents(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** family_parts all in family string; given full or initial */
export function nameMatchesAuthor(author, { familyParts, givenNames, givenInitials }) {
  const family = stripAccents(author.family || "");
  const given = stripAccents(author.given || "");
  if (!familyParts?.length) return false;
  if (!familyParts.every((p) => family.includes(stripAccents(p)))) return false;
  const g0 = given.split(/\s+/)[0] || "";
  const initial = g0.slice(0, 1);
  if (givenNames?.some((n) => g0 === stripAccents(n) || given.includes(stripAccents(n)))) {
    return true;
  }
  if (givenInitials?.some((i) => initial === stripAccents(i))) return true;
  // ORCID-only papers sometimes omit given
  if (!given) return true;
  return false;
}

export async function fetchOrcidWorks(orcid) {
  const data = await fetchJson(`https://pub.orcid.org/v3.0/${orcid}/works`);
  const out = [];
  for (const g of data.group || []) {
    const summaries = g["work-summary"] || [];
    if (!summaries.length) continue;
    // prefer summary with DOI
    let chosen = summaries[0];
    for (const s of summaries) {
      const ext = s["external-ids"]?.["external-id"] || [];
      if (ext.some((e) => (e["external-id-type"] || "").toLowerCase() === "doi")) {
        chosen = s;
        break;
      }
    }
    const ext = chosen["external-ids"]?.["external-id"] || [];
    let doi = "";
    for (const e of ext) {
      if ((e["external-id-type"] || "").toLowerCase() === "doi") {
        doi = normalizeDoi(e["external-id-value"]);
        break;
      }
    }
    const title = chosen.title?.title?.value || "";
    const year = chosen["publication-date"]?.year?.value || "";
    const type = chosen.type || "";
    const putCode = chosen["put-code"];
    out.push({ doi, title, year, type, putCode, orcid });
  }
  return out;
}

export async function fetchCrossrefWork(doi) {
  const d = normalizeDoi(doi);
  if (!d) return null;
  try {
    const data = await fetchJson(
      `https://api.crossref.org/works/${encodeURIComponent(d)}`,
    );
    return data.message;
  } catch {
    return null;
  }
}

export function identityConfidence(msg, orcid, matchOpts) {
  if (!msg) return "C";
  const authors = msg.author || [];
  const orcidNorm = orcid.toLowerCase();
  for (const a of authors) {
    const o = (a.ORCID || "").replace(/https?:\/\/orcid\.org\//i, "").toLowerCase();
    if (o && o === orcidNorm) return "A";
  }
  for (const a of authors) {
    if (nameMatchesAuthor(a, matchOpts)) return "B";
  }
  return "E";
}

export function yearFromCrossref(msg) {
  const parts =
    msg.published?.["date-parts"]?.[0] ||
    msg["published-print"]?.["date-parts"]?.[0] ||
    msg["published-online"]?.["date-parts"]?.[0] ||
    msg.created?.["date-parts"]?.[0];
  if (!parts?.[0]) return "";
  return String(parts[0]);
}

export function dateIssuedFromCrossref(msg) {
  const parts =
    msg.published?.["date-parts"]?.[0] ||
    msg["published-print"]?.["date-parts"]?.[0] ||
    msg["published-online"]?.["date-parts"]?.[0];
  if (!parts?.[0]) return "";
  const y = parts[0];
  const m = parts[1] ? String(parts[1]).padStart(2, "0") : "";
  const d = parts[2] ? String(parts[2]).padStart(2, "0") : "";
  if (m && d) return `${y}-${m}-${d}`;
  if (m) return `${y}-${m}`;
  return String(y);
}
