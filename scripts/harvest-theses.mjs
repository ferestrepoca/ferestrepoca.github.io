#!/usr/bin/env node
/** RI UNAL → web/src/data/theses.json + students.json. */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import {
  classifyDegree,
  isEngineeringProgram,
  estudianteIdFromName,
  splitAuthors,
  sleep,
  normText,
} from "./lib/normalize.mjs";
import { discoverSearch, fetchOwningCollectionName, summarizeItem } from "./lib/ri.mjs";
import { getDataDir, readJson, ROOT, writeJsonBatch } from "./lib/json-store.mjs";
import { validatePerson, validateStudents, validateTheses } from "./lib/data-validation.mjs";

const PERSON_DOCENTE_ID = "docente:ferestrepoca";
const PIPELINE_TEST_DIR = path.join(ROOT, "data", "pipeline_test");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = { dryRun: false, testHoldout: null, maxPages: 30, queryDelayMs: 120, dataDir: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--test-holdout") args.testHoldout = argv[++i];
    else if (arg === "--max-pages") args.maxPages = Number(argv[++i]);
    else if (arg === "--data-dir") args.dataDir = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function aliasesFromPerson(person) {
  return Array.isArray(person.aliases)
    ? person.aliases.map((alias) => String(alias).trim()).filter(Boolean)
    : [];
}

export function matchPersonAdvisor(advisorNames, aliases) {
  const normalizedAliases = aliases.map((alias) => normText(alias.replace(/\(thesis advisor\)/gi, "")));
  for (const raw of advisorNames) {
    const normalized = normText(raw.replace(/\(thesis advisor\)/gi, ""));
    for (const alias of normalizedAliases) {
      if (alias && (normalized === alias || normalized.includes(alias) || alias.includes(normalized))) {
        return { ok: true, name_form_raw: raw };
      }
    }
  }
  return { ok: false };
}

export function shouldRegister({ degree, engineering, isAdvisor }) {
  if (!degree) return { ok: false, reason: "not_posgrado" };
  if (engineering === false) return { ok: false, reason: "no_ingenieria" };
  if (engineering == null) return { ok: false, reason: "programa_desconocido" };
  if (!isAdvisor) return { ok: false, reason: "sin_director_persona" };
  return { ok: true, reason: "" };
}

async function harvestFromRi({ aliases, maxPages, delayMs }) {
  const byHandle = new Map();
  const queries = [];
  const seen = new Set();
  for (const alias of aliases) {
    const key = normText(alias);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    queries.push(alias);
  }

  console.log(`Consultando RI: ${queries.length} aliases de ${PERSON_DOCENTE_ID}…`);
  for (let index = 0; index < queries.length; index++) {
    const query = queries[index];
    process.stdout.write(`  [${index + 1}/${queries.length}] «${query}» `);
    try {
      const items = await discoverSearch(`"${query}"`, { maxPages, delayMs });
      let added = 0;
      for (const item of items) {
        const summary = summarizeItem(item);
        if (!summary.handle) continue;
        const hit = matchPersonAdvisor(summary.advisors, aliases);
        if (!hit.ok) continue;
        if (!byHandle.has(summary.handle)) {
          byHandle.set(summary.handle, { ...summary, matchedAdvisor: hit.name_form_raw });
          added++;
        }
      }
      console.log(`→ ${items.length} hits, +${added} nuevos handles`);
    } catch (error) {
      console.log(`ERROR: ${error.message}`);
    }
    await sleep(delayMs);
  }
  return [...byHandle.values()];
}

async function enrichProgram(summary) {
  return summary.degreeName || (await fetchOwningCollectionName(summary.uuid)) || "";
}

export function rebuildStudentsFromTheses(theses) {
  const students = new Map();
  const sorted = theses
    .filter((thesis) => thesis.visible !== false)
    .sort((a, b) => String(a.year).localeCompare(String(b.year)) || a.id.localeCompare(b.id));

  for (const thesis of sorted) {
    if (!thesis.student_id || !thesis.student_name) continue;
    const rank = thesis.degree === "doctorado" ? 3 : 2;
    const current = students.get(thesis.student_id);
    const thesisView = {
      id: thesis.id,
      title: thesis.title,
      year: thesis.year,
      degree: thesis.degree,
      url: thesis.item_url,
    };

    if (!current) {
      students.set(thesis.student_id, {
        id: thesis.student_id,
        name_display: thesis.student_name,
        name_sort: thesis.student_name,
        degree_highest: thesis.degree,
        n_tesis: 1,
        role_degree: thesis.degree,
        thesis: thesisView,
        links: thesis.item_url ? [{ label: "Tesis", label_en: "Thesis", url: thesis.item_url }] : [],
        _rank: rank,
      });
      continue;
    }

    current.n_tesis++;
    current.name_display = thesis.student_name;
    if (rank > current._rank) {
      current._rank = rank;
      current.degree_highest = thesis.degree;
      current.role_degree = thesis.degree;
    }
    if (String(thesis.year) >= String(current.thesis?.year || "")) {
      current.thesis = thesisView;
      current.links = thesis.item_url ? [{ label: "Tesis", label_en: "Thesis", url: thesis.item_url }] : [];
    }
  }

  return [...students.values()]
    .map(({ _rank, ...student }) => student)
    .sort((a, b) => a.name_sort.localeCompare(b.name_sort, "es"));
}

async function persist(theses, students, { dryRun, dataDir }) {
  validateTheses(theses);
  validateStudents(students, theses);
  if (dryRun) {
    console.log("Dry-run: no se escriben archivos JSON.");
    return [];
  }
  const written = await writeJsonBatch(
    [["theses.json", theses], ["students.json", students]],
    { dataDir },
  );
  console.log(written.length ? `JSON actualizados: ${written.join(", ")}` : "JSON sin cambios.");
  return written;
}

export async function harvestTheses(options = {}) {
  const args = {
    dryRun: false,
    testHoldout: null,
    maxPages: 30,
    queryDelayMs: 120,
    getHarvested: harvestFromRi,
    getProgram: enrichProgram,
    itemDelay: sleep,
    ...options,
  };
  const person = await readJson("person.json", { dataDir: args.dataDir });
  validatePerson(person);
  if (person.id !== PERSON_DOCENTE_ID) throw new Error(`Unexpected person.id: ${person.id}`);
  let theses = await readJson("theses.json", { dataDir: args.dataDir });
  validateTheses(theses);

  const aliases = aliasesFromPerson(person);
  if (!aliases.length) throw new Error("person.aliases vacío");

  let holdout = null;
  const reportDir = args.dataDir ? path.join(getDataDir(args.dataDir), ".pipeline_test") : PIPELINE_TEST_DIR;
  if (args.testHoldout) {
    const handle = args.testHoldout.replace(/^tesis:/, "");
    const id = `tesis:${handle}`;
    holdout = theses.find((thesis) => thesis.id === id || thesis.handle === handle);
    if (!holdout) throw new Error(`Holdout no encontrado: ${args.testHoldout}`);
    theses = theses.filter((thesis) => thesis.id !== holdout.id);
    await mkdir(reportDir, { recursive: true });
    await writeFile(path.join(reportDir, "holdout.json"), `${JSON.stringify(holdout, null, 2)}\n`, "utf8");
    console.log(`Holdout apartado: ${holdout.id}`);
  }

  const existing = new Set(theses.map((thesis) => thesis.handle));
  const harvested = await args.getHarvested({ aliases, maxPages: args.maxPages, delayMs: args.queryDelayMs });
  console.log(`Handles únicos con match advisor: ${harvested.length}`);
  const stats = { examined: 0, new: 0, skipped: {}, added: [] };

  for (const summary of harvested) {
    stats.examined++;
    if (existing.has(summary.handle)) continue;

    const hit = matchPersonAdvisor(summary.advisors, aliases);
    const degree = classifyDegree(summary.dcTypes);
    const degreeName = await args.getProgram(summary);
    const gate = shouldRegister({
      degree,
      engineering: isEngineeringProgram(degreeName),
      isAdvisor: hit.ok,
    });
    if (!gate.ok) {
      stats.skipped[gate.reason] = (stats.skipped[gate.reason] || 0) + 1;
      continue;
    }

    const authors = summary.authorsList.length ? summary.authorsList : splitAuthors(summary.authors);
    const studentName = authors[0] || summary.authors || "";
    const studentId = studentName ? estudianteIdFromName(studentName) : "";
    const thesis = {
      id: `tesis:${summary.handle}`,
      handle: summary.handle,
      title: summary.title,
      year: summary.year,
      degree,
      degree_name_ri: degreeName,
      item_url: summary.itemUrl,
      student_id: studentId,
      student_name: studentName,
      advisor_ids: [PERSON_DOCENTE_ID],
      abstract_es: summary.abstractEs || "",
      source: "repositorio_unal",
      harvested_at: today(),
      visible: true,
    };
    theses.push(thesis);
    existing.add(summary.handle);
    stats.new++;
    stats.added.push({ handle: summary.handle, title: summary.title });
    console.log(`+ ${summary.handle} · ${studentName} · ${summary.title.slice(0, 50)}`);
    await args.itemDelay(80);
  }

  theses.sort((a, b) => String(b.year).localeCompare(String(a.year)) || a.title.localeCompare(b.title, "es"));
  const students = rebuildStudentsFromTheses(theses);
  console.log("\nResumen:", JSON.stringify({ examined: stats.examined, new: stats.new, skipped: stats.skipped, students: students.length }, null, 2));
  const written = await persist(theses, students, args);

  if (holdout) {
    const got = theses.find((thesis) => thesis.id === holdout.id);
    const report = {
      ok: Boolean(got?.student_id || got?.student_name),
      checks: [
        { name: "tesis_recreada", pass: Boolean(got) },
        { name: "student_nonempty", pass: Boolean(got?.student_id || got?.student_name) },
      ],
    };
    report.ok = report.checks.every((check) => check.pass);
    await mkdir(reportDir, { recursive: true });
    await writeFile(path.join(reportDir, "compare_report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(report.ok ? "\nHoldout OK" : "\nHoldout FALLÓ");
    if (!report.ok) process.exitCode = 1;
  }
  return { theses, students, stats, written };
}

const isDirectRun = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Uso:\n  node scripts/harvest-theses.mjs [--dry-run] [--max-pages N] [--data-dir DIR]`);
  } else {
    harvestTheses(args).catch((error) => {
      console.error(error);
      process.exit(1);
    });
  }
}
