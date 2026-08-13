#!/usr/bin/env node
/**
 * ORCID → Crossref → publications (modelo slim, sitio personal).
 * Autores se denormalizan en authors_display; no hay tabla people.
 *
 * Merge: parte de seeds (rebuild), actualiza/añade obras ORCID y **conserva**
 * filas manuales / html+crossref que no vengan en ORCID.
 */
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
import {
  buildDbFromSql,
  openDb,
  readTable,
  replaceTable,
  writeSeeds,
  PERSON_DOCENTE_ID,
} from "./lib/db.mjs";

const TODAY = new Date().toISOString().slice(0, 10);

const MATCH = {
  familyParts: ["restrepo", "calle"],
  givenNames: ["felipe"],
  givenInitials: ["f"],
};

const PUB_HEADERS = [
  "id",
  "doi",
  "title",
  "year",
  "date_issued",
  "typology",
  "typology_label_es",
  "venue_title",
  "authors_display",
  "publisher_name",
  "url",
  "identity_confidence",
  "harvest_sources",
  "orcid_put_codes",
  "harvested_at",
  "notes",
];

/** Tokens preferidos al fusionar harvest_sources (html primero). */
const SOURCE_ORDER = ["html", "orcid", "crossref", "crossref_miss"];

function parseArgs(argv) {
  const opts = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") opts.dryRun = true;
  }
  return opts;
}

function pubIdFromDoi(doi) {
  return `pub:doi:${normalizeDoi(doi)}`;
}

function pubIdFromOrcid(orcid, putCode) {
  return `pub:orcid:${orcid.replace(/-/g, "")}:${putCode}`;
}

function mergePutCodes(a, b) {
  const s = new Set([...(a || "").split("|"), ...(b || "").split("|")].filter(Boolean));
  return [...s].sort().join("|");
}

/** Une tokens de fuentes: "html+crossref" + "orcid+crossref" → "html+orcid+crossref". */
export function mergeHarvestSources(...parts) {
  const tokens = new Set();
  for (const part of parts) {
    for (const t of String(part || "")
      .split(/[+|/,]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)) {
      tokens.add(t);
    }
  }
  const ordered = SOURCE_ORDER.filter((t) => tokens.has(t));
  for (const t of tokens) {
    if (!ordered.includes(t)) ordered.push(t);
  }
  return ordered.join("+");
}

/** Pubs añadidas a mano / gap HTML: no deben desaparecer en un re-harvest ORCID. */
export function isProtectedPub(row) {
  const sources = String(row?.harvest_sources || "").toLowerCase();
  const notes = String(row?.notes || "").toLowerCase();
  return sources.includes("html") || notes.includes("html") || notes.includes("manual");
}

function authorsDisplayFromCrossref(msg, fallbackName) {
  const authors = msg?.author?.length
    ? msg.author.map((a) => `${a.given || ""} ${a.family || ""}`.trim()).filter(Boolean)
    : [fallbackName];
  return authors.join("; ");
}

function orcidSourceLabel(doi, msg) {
  if (!doi) return "orcid";
  return msg ? "orcid+crossref" : "orcid+crossref_miss";
}

async function main() {
  const opts = parseArgs(process.argv);

  // Seeds son la fuente canónica (incl. html+crossref). Evita que un SQLite viejo
  // reescriba publications.sql sin esas filas.
  await buildDbFromSql({ quiet: true });
  const db = openDb();
  const person = readTable(db, "person").find((p) => p.id === PERSON_DOCENTE_ID);
  if (!person?.orcid) {
    console.error("person.orcid missing");
    process.exit(1);
  }
  const pubs = new Map(readTable(db, "publications").map((r) => [r.id, r]));
  db.close();

  const protectedIds = new Set(
    [...pubs.values()].filter(isProtectedPub).map((r) => r.id),
  );
  const seenThisRun = new Set();

  console.log(`\n== ${person.name_display} (${person.orcid})`);
  console.log(`baseline pubs=${pubs.size} protected_html/manual=${protectedIds.size}`);

  const works = await fetchOrcidWorks(person.orcid);
  const stats = {
    works: works.length,
    accepted: 0,
    quarantine: 0,
    merged_protected: 0,
    preserved_protected: 0,
  };
  await sleepMs(200);

  for (const w of works) {
    let pubId;
    let conf;
    let title = w.title;
    let year = w.year;
    let dateIssued = "";
    let venue = "";
    let publisher = "";
    let url = w.doi ? `https://doi.org/${w.doi}` : "";
    let typ;
    let authorsDisplay = person.name_display;
    let msg = null;

    if (w.doi) {
      msg = await fetchCrossrefWork(w.doi);
      await sleepMs(150);
      conf = identityConfidence(msg, person.orcid, MATCH);
      if (conf === "E") {
        stats.quarantine++;
        console.log(`  QUARANTINE E  ${w.doi}  ${(title || "").slice(0, 60)}`);
        continue;
      }
      if (msg) {
        title = (msg.title && msg.title[0]) || title;
        year = yearFromCrossref(msg) || year;
        dateIssued = dateIssuedFromCrossref(msg);
        venue = (msg["container-title"] && msg["container-title"][0]) || "";
        publisher = msg.publisher || "";
        typ = typologyFromCrossref(msg.type);
        url = msg.URL || url;
        pubId = pubIdFromDoi(w.doi);
        authorsDisplay = authorsDisplayFromCrossref(msg, person.name_display);
        if (!conf || conf === "C") {
          conf = identityConfidence(msg, person.orcid, MATCH);
          if (conf === "E") {
            stats.quarantine++;
            continue;
          }
          if (conf === "C") conf = "B";
        }
      } else {
        typ = typologyFromOrcid(w.type);
        pubId = pubIdFromDoi(w.doi);
        conf = "C";
      }
    } else {
      conf = "D";
      typ = typologyFromOrcid(w.type);
      pubId = pubIdFromOrcid(person.orcid, w.putCode);
    }

    if (!typ) typ = typologyFromOrcid(w.type);

    const existing = pubs.get(pubId);
    const incomingSources = orcidSourceLabel(w.doi, msg);
    const row = existing || {
      id: pubId,
      doi: w.doi || "",
      title: title || "",
      year: year || "",
      date_issued: dateIssued || "",
      typology: typ.typology || "",
      typology_label_es: typ.typology_label_es || "",
      venue_title: venue,
      authors_display: authorsDisplay,
      publisher_name: publisher,
      url,
      identity_confidence: conf,
      harvest_sources: incomingSources,
      orcid_put_codes: String(w.putCode || ""),
      harvested_at: TODAY,
      notes: conf === "C" ? "crossref_unresolved" : "",
    };

    if (existing) {
      const protectedRow = isProtectedPub(existing);
      if (protectedRow) stats.merged_protected++;

      row.orcid_put_codes = mergePutCodes(existing.orcid_put_codes, String(w.putCode || ""));
      row.harvest_sources = mergeHarvestSources(existing.harvest_sources, incomingSources);

      const rank = { A: 4, B: 3, D: 2, C: 1, E: 0 };
      if ((rank[conf] || 0) > (rank[existing.identity_confidence] || 0)) {
        row.identity_confidence = conf;
      }

      // Enriquecer huecos; no borrar notas de pubs protegidas.
      if (!row.title && title) row.title = title;
      if (!row.year && year) row.year = year;
      if (!row.date_issued && dateIssued) row.date_issued = dateIssued;
      if (!row.publisher_name && publisher) row.publisher_name = publisher;
      if (!row.venue_title && venue) row.venue_title = venue;
      if (!row.url && url) row.url = url;
      if (authorsDisplay) row.authors_display = authorsDisplay;
      if (typ?.typology && !protectedRow) {
        row.typology = typ.typology;
        row.typology_label_es = typ.typology_label_es || row.typology_label_es;
      }
      if (protectedRow) {
        row.notes = existing.notes || row.notes;
      } else if (!row.notes && conf === "C") {
        row.notes = "crossref_unresolved";
      }
      row.harvested_at = TODAY;
    }

    pubs.set(pubId, row);
    seenThisRun.add(pubId);
    stats.accepted++;
  }

  // Garantía: ninguna protegida del baseline puede desaparecer.
  const missingProtected = [...protectedIds].filter((id) => !pubs.has(id));
  if (missingProtected.length) {
    throw new Error(
      `harvest would drop protected pubs:\n  ${missingProtected.join("\n  ")}`,
    );
  }

  stats.preserved_protected = [...protectedIds].filter((id) => !seenThisRun.has(id)).length;

  const pubRows = [...pubs.values()].sort(
    (a, b) => String(b.year).localeCompare(String(a.year)) || a.id.localeCompare(b.id),
  );

  console.log("\n=== summary ===");
  console.log(JSON.stringify(stats, null, 2));
  console.log(`rows: pubs=${pubRows.length} (orcid_touched=${seenThisRun.size})`);
  if (protectedIds.size) {
    console.log(
      `protected kept: ${[...protectedIds].map((id) => id.replace(/^pub:doi:/, "")).join(", ")}`,
    );
  }

  if (opts.dryRun) {
    console.log("dry-run: not writing");
    return;
  }

  const out = openDb();
  replaceTable(out, "publications", pubRows, PUB_HEADERS);
  await writeSeeds(out, ["publications"]);
  out.close();
  console.log("wrote SQLite + publications.sql");
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
