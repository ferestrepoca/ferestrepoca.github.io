/** Text / name normalization helpers */

export function stripAccents(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "");
}

export function normText(s) {
  return stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function nameKey(name) {
  return normText(String(name || "").replace(/,/g, " "));
}

export function estudianteIdFromName(name) {
  const key = nameKey(name);
  return "estudiante:" + key.replace(/\s+/g, "-");
}

export function splitAuthors(authors) {
  return String(authors || "")
    .split(/\s*\|\s*/)
    .map((a) => a.trim())
    .filter(Boolean);
}

export function metaValues(metadata, key) {
  const arr = metadata?.[key];
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => x?.value).filter(Boolean);
}

export function metaFirst(metadata, key) {
  return metaValues(metadata, key)[0] || "";
}

export function yearFromDate(s) {
  const m = String(s || "").match(/(\d{4})/);
  return m ? m[1] : "";
}

export function classifyDegree(dcTypes) {
  const t = normText(dcTypes.join(" "));
  if (/doctorado|doctoral/.test(t)) return "doctorado";
  if (/maestr|master\s*thesis|masterthesis/.test(t)) return "maestria";
  return null;
}

export function isEngineeringProgram(name) {
  const n = normText(name);
  if (!n) return null;
  return /ingenier|engineering/.test(n);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
