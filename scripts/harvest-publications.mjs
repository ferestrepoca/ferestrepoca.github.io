#!/usr/bin/env node
/** ORCID → Crossref → web/src/data/publications.json. */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { typologyFromCrossref, typologyFromOrcid } from "./lib/typology.mjs";
import {
  fetchOrcidWorks,
  fetchCrossrefWork,
  identityConfidence,
  normalizeDoi,
  yearFromCrossref,
  dateIssuedFromCrossref,
  sleep as sleepMs,
} from "./lib/orcid-crossref.mjs";
import { readJson, writeJson } from "./lib/json-store.mjs";
import { validatePerson, validatePublications } from "./lib/data-validation.mjs";

const TODAY = new Date().toISOString().slice(0, 10);
const PERSON_DOCENTE_ID = "docente:ferestrepoca";
const MATCH = {
  familyParts: ["restrepo", "calle"],
  givenNames: ["felipe"],
  givenInitials: ["f"],
};
const SOURCE_ORDER = ["html", "orcid", "crossref", "crossref_miss"];

function parseArgs(argv) {
  const opts = { dryRun: false, dataDir: undefined };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") opts.dryRun = true;
    else if (argv[i] === "--data-dir") opts.dataDir = argv[++i];
  }
  return opts;
}

function pubIdFromDoi(doi) {
  return `pub:doi:${normalizeDoi(doi)}`;
}

function pubIdFromOrcid(orcid, putCode) {
  return `pub:orcid:${orcid.replace(/-/g, "")}:${putCode}`;
}

function tokens(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "").split(/[+|/,]/).map((item) => item.trim()).filter(Boolean);
}

export function mergePutCodes(...parts) {
  return [...new Set(parts.flatMap(tokens))].sort();
}

export function mergeHarvestSources(...parts) {
  const sourceSet = new Set(parts.flatMap(tokens).map((source) => source.toLowerCase()));
  const ordered = SOURCE_ORDER.filter((source) => sourceSet.has(source));
  for (const source of sourceSet) {
    if (!ordered.includes(source)) ordered.push(source);
  }
  return ordered;
}

export function isProtectedPub(row) {
  const sources = tokens(row?.harvest_sources).map((source) => source.toLowerCase());
  const notes = String(row?.notes || "").toLowerCase();
  return sources.some((source) => source === "html" || source.includes("manual")) ||
    notes.includes("html") || notes.includes("manual");
}

function authorsFromCrossref(message, fallbackName) {
  const authors = message?.author?.length
    ? message.author.map((author) => `${author.given || ""} ${author.family || ""}`.trim()).filter(Boolean)
    : [fallbackName];
  return authors.join("; ");
}

function incomingSources(doi, message) {
  if (!doi) return ["orcid"];
  return message ? ["orcid", "crossref"] : ["orcid", "crossref_miss"];
}

export async function harvestPublications({
  dryRun = false,
  dataDir,
  getOrcidWorks = fetchOrcidWorks,
  getCrossrefWork = fetchCrossrefWork,
  sleep = sleepMs,
} = {}) {
  const person = await readJson("person.json", { dataDir });
  validatePerson(person);
  if (person.id !== PERSON_DOCENTE_ID) throw new Error(`Unexpected person.id: ${person.id}`);

  const baseline = await readJson("publications.json", { dataDir });
  validatePublications(baseline);
  const publications = new Map(baseline.map((row) => [row.id, { ...row }]));
  const protectedIds = new Set([...publications.values()].filter(isProtectedPub).map((row) => row.id));
  const seenThisRun = new Set();

  console.log(`\n== ${person.name_display} (${person.orcid})`);
  console.log(`baseline pubs=${publications.size} protected_html/manual=${protectedIds.size}`);

  const works = await getOrcidWorks(person.orcid);
  const stats = { works: works.length, accepted: 0, quarantine: 0, merged_protected: 0, preserved_protected: 0 };
  await sleep(200);

  for (const work of works) {
    let publicationId;
    let confidence;
    let title = work.title;
    let year = work.year;
    let dateIssued = "";
    let venue = "";
    let publisher = "";
    let url = work.doi ? `https://doi.org/${work.doi}` : "";
    let typology;
    let authors = person.name_display;
    let message = null;

    if (work.doi) {
      message = await getCrossrefWork(work.doi);
      await sleep(150);
      confidence = identityConfidence(message, person.orcid, MATCH);
      if (confidence === "E") {
        stats.quarantine++;
        console.log(`  QUARANTINE E  ${work.doi}  ${(title || "").slice(0, 60)}`);
        continue;
      }
      publicationId = pubIdFromDoi(work.doi);
      if (message) {
        title = message.title?.[0] || title;
        year = yearFromCrossref(message) || year;
        dateIssued = dateIssuedFromCrossref(message);
        venue = message["container-title"]?.[0] || "";
        publisher = message.publisher || "";
        typology = typologyFromCrossref(message.type);
        url = message.URL || url;
        authors = authorsFromCrossref(message, person.name_display);
        if (!confidence || confidence === "C") confidence = "B";
      } else {
        typology = typologyFromOrcid(work.type);
        confidence = "C";
      }
    } else {
      confidence = "D";
      typology = typologyFromOrcid(work.type);
      publicationId = pubIdFromOrcid(person.orcid, work.putCode);
    }

    if (!typology) typology = typologyFromOrcid(work.type);
    const existing = publications.get(publicationId);
    const sources = incomingSources(work.doi, message);
    const row = existing || {
      id: publicationId,
      doi: work.doi || "",
      title: title || "",
      year: year || "",
      date_issued: dateIssued,
      typology: typology.typology || "unknown",
      typology_label_es: typology.typology_label_es || "",
      venue_title: venue,
      authors,
      publisher_name: publisher,
      url,
      identity_confidence: confidence,
      harvest_sources: sources,
      orcid_put_codes: mergePutCodes(String(work.putCode || "")),
      harvested_at: TODAY,
      notes: confidence === "C" ? "crossref_unresolved" : "",
    };

    if (existing) {
      const protectedRow = isProtectedPub(existing);
      if (protectedRow) stats.merged_protected++;
      row.orcid_put_codes = mergePutCodes(existing.orcid_put_codes, String(work.putCode || ""));
      row.harvest_sources = mergeHarvestSources(existing.harvest_sources, sources);

      const rank = { A: 4, B: 3, D: 2, C: 1, E: 0 };
      if ((rank[confidence] || 0) > (rank[existing.identity_confidence] || 0)) row.identity_confidence = confidence;
      if (!row.title && title) row.title = title;
      if (!row.year && year) row.year = year;
      if (!row.date_issued && dateIssued) row.date_issued = dateIssued;
      if (!row.publisher_name && publisher) row.publisher_name = publisher;
      if (!row.venue_title && venue) row.venue_title = venue;
      if (!row.url && url) row.url = url;
      if (authors) row.authors = authors;
      if (typology?.typology && !protectedRow) {
        row.typology = typology.typology;
        row.typology_label_es = typology.typology_label_es || row.typology_label_es;
      }
      if (!protectedRow && !row.notes && confidence === "C") row.notes = "crossref_unresolved";
      row.harvested_at = TODAY;
    }

    publications.set(publicationId, row);
    seenThisRun.add(publicationId);
    stats.accepted++;
  }

  const missingProtected = [...protectedIds].filter((id) => !publications.has(id));
  if (missingProtected.length) throw new Error(`harvest would drop protected pubs:\n  ${missingProtected.join("\n  ")}`);
  stats.preserved_protected = [...protectedIds].filter((id) => !seenThisRun.has(id)).length;

  const rows = [...publications.values()].sort(
    (a, b) => String(b.year).localeCompare(String(a.year)) || a.id.localeCompare(b.id),
  );
  validatePublications(rows);

  console.log("\n=== summary ===");
  console.log(JSON.stringify(stats, null, 2));
  console.log(`rows: pubs=${rows.length} (orcid_touched=${seenThisRun.size})`);
  if (dryRun) {
    console.log("dry-run: not writing");
    return { rows, stats, written: [] };
  }

  const written = await writeJson("publications.json", rows, { dataDir });
  console.log(written.length ? "publications.json updated" : "publications.json unchanged");
  return { rows, stats, written };
}

const isDirectRun = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  harvestPublications(parseArgs(process.argv)).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
