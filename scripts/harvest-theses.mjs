#!/usr/bin/env node
/**
 * Cosecha de tesis (RI UNAL) — modelo slim, sitio personal.
 * Solo tesis donde ferestrepoca es advisor; estudiante embebido en theses + students.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import {
  classifyDegree,
  isEngineeringProgram,
  estudianteIdFromName,
  nameKey,
  splitAuthors,
  sleep,
  normText,
} from "./lib/normalize.mjs";
import { discoverSearch, fetchOwningCollectionName, summarizeItem } from "./lib/ri.mjs";
import {
  ensureDb,
  readTable,
  replaceTable,
  writeSeeds,
  PIPELINE_TEST_DIR,
  PERSON_DOCENTE_ID,
} from "./lib/db.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TESIS_HEADERS = [
  "id",
  "handle",
  "title",
  "year",
  "degree",
  "degree_name_ri",
  "item_url",
  "student_id",
  "student_name",
  "abstract_es",
  "source",
  "harvested_at",
  "visible",
];

const STUDENT_HEADERS = [
  "id",
  "name_display",
  "name_sort",
  "degree_highest",
  "n_tesis",
  "thesis_id",
  "thesis_title",
  "thesis_year",
  "thesis_degree",
  "thesis_url",
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    testHoldout: null,
    maxPages: 30,
    queryDelayMs: 120,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--test-holdout") args.testHoldout = argv[++i];
    else if (a === "--max-pages") args.maxPages = Number(argv[++i]);
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function parseAliases(person) {
  try {
    const list = JSON.parse(person.aliases_json || "[]");
    return Array.isArray(list) ? list.map((a) => String(a).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function matchPersonAdvisor(advisorNames, aliases) {
  const norms = aliases.map((a) => normText(a.replace(/\(thesis advisor\)/gi, "")));
  for (const raw of advisorNames) {
    const n = normText(raw.replace(/\(thesis advisor\)/gi, ""));
    for (const an of norms) {
      if (!an) continue;
      if (n === an || n.includes(an) || an.includes(n)) {
        return { ok: true, name_form_raw: raw };
      }
    }
  }
  return { ok: false };
}

function shouldRegister({ degree, engineering, isAdvisor }) {
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
  let qi = 0;
  for (const query of queries) {
    qi++;
    process.stdout.write(`  [${qi}/${queries.length}] «${query}» `);
    try {
      const items = await discoverSearch(`"${query}"`, { maxPages, delayMs });
      let added = 0;
      for (const item of items) {
        const sum = summarizeItem(item);
        if (!sum.handle) continue;
        const hit = matchPersonAdvisor(sum.advisors, aliases);
        if (!hit.ok) continue;
        if (!byHandle.has(sum.handle)) {
          byHandle.set(sum.handle, { ...sum, matchedAdvisor: hit.name_form_raw });
          added++;
        }
      }
      console.log(`→ ${items.length} hits, +${added} nuevos handles`);
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
    await sleep(delayMs);
  }
  return [...byHandle.values()];
}

async function enrichProgram(sum) {
  let degreeName = sum.degreeName;
  if (!degreeName) degreeName = await fetchOwningCollectionName(sum.uuid);
  return degreeName || "";
}

function upsertStudent(students, { name, degree, year, thesis }) {
  const id = estudianteIdFromName(name);
  let e = students.find((x) => x.id === id);
  const rank = degree === "doctorado" ? 3 : 2;
  if (!e) {
    e = {
      id,
      name_display: name,
      name_sort: name,
      degree_highest: degree,
      n_tesis: "1",
      thesis_id: thesis.id,
      thesis_title: thesis.title,
      thesis_year: thesis.year,
      thesis_degree: degree,
      thesis_url: thesis.item_url,
      _rank: rank,
    };
    students.push(e);
    return { estudiante: e, created: true };
  }
  e.n_tesis = String(Number(e.n_tesis || 0) + 1);
  if (rank >= (e._rank || 0) || String(year) >= String(e.thesis_year || "")) {
    e.degree_highest = degree;
    e._rank = Math.max(e._rank || 0, rank);
    e.thesis_id = thesis.id;
    e.thesis_title = thesis.title;
    e.thesis_year = thesis.year;
    e.thesis_degree = degree;
    e.thesis_url = thesis.item_url;
  }
  return { estudiante: e, created: false };
}

function rebuildStudentsFromTheses(theses) {
  const students = [];
  const sorted = [...theses].sort((a, b) => String(a.year).localeCompare(String(b.year)));
  for (const t of sorted) {
    if (!t.student_id && !t.student_name) continue;
    const name = t.student_name || t.student_id;
    const id = t.student_id || estudianteIdFromName(name);
    let e = students.find((x) => x.id === id);
    if (!e) {
      students.push({
        id,
        name_display: name,
        name_sort: nameKey(name) ? name : name,
        degree_highest: t.degree,
        n_tesis: "1",
        thesis_id: t.id,
        thesis_title: t.title,
        thesis_year: t.year,
        thesis_degree: t.degree,
        thesis_url: t.item_url,
      });
    } else {
      e.n_tesis = String(Number(e.n_tesis || 0) + 1);
      if (String(t.year) >= String(e.thesis_year || "")) {
        e.degree_highest = t.degree;
        e.thesis_id = t.id;
        e.thesis_title = t.title;
        e.thesis_year = t.year;
        e.thesis_degree = t.degree;
        e.thesis_url = t.item_url;
        e.name_display = name;
      }
    }
  }
  return students.sort((a, b) => a.name_sort.localeCompare(b.name_sort, "es"));
}

async function persist(theses, students, { dryRun }) {
  if (dryRun) {
    console.log("Dry-run: no se escribe SQLite/seed.");
    return;
  }
  const cleanStudents = students.map((s) => {
    const o = { ...s };
    delete o._rank;
    return o;
  });
  const db = await ensureDb();
  replaceTable(db, "theses", theses, TESIS_HEADERS);
  replaceTable(db, "students", cleanStudents, STUDENT_HEADERS);
  await writeSeeds(db, ["theses", "students"]);
  db.close();
  console.log("SQLite + seed SQL actualizados.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Uso:
  node scripts/harvest-theses.mjs [--dry-run] [--max-pages N]

Flujo:
  1) Lee aliases_json de person
  2) Consulta RI UNAL
  3) Registra posgrado + Ingeniería + advisor = ferestrepoca
  4) Embebe estudiante en theses y regenera students
`);
    return;
  }

  const db = await ensureDb();
  const person = readTable(db, "person").find((p) => p.id === PERSON_DOCENTE_ID);
  let theses = readTable(db, "theses");
  db.close();

  if (!person) {
    console.error("person row missing");
    process.exit(1);
  }

  const aliases = parseAliases(person);
  if (!aliases.length) {
    console.error("person.aliases_json vacío");
    process.exit(1);
  }

  let holdout = null;
  if (args.testHoldout) {
    const handle = args.testHoldout.replace(/^tesis:/, "");
    const tid = `tesis:${handle}`;
    holdout = theses.find((t) => t.id === tid || t.handle === handle);
    if (!holdout) throw new Error(`Holdout no encontrado: ${args.testHoldout}`);
    theses = theses.filter((t) => t.id !== holdout.id);
    await mkdir(PIPELINE_TEST_DIR, { recursive: true });
    await writeFile(
      path.join(PIPELINE_TEST_DIR, "holdout.json"),
      JSON.stringify(holdout, null, 2),
      "utf8",
    );
    console.log(`Holdout apartado: ${holdout.id}`);
  }

  const existing = new Set(theses.map((t) => t.handle));
  const harvested = await harvestFromRi({
    aliases,
    maxPages: args.maxPages,
    delayMs: args.queryDelayMs,
  });

  console.log(`Handles únicos con match advisor: ${harvested.length}`);
  const stats = { examined: 0, new: 0, skipped: {}, added: [] };

  for (const sum of harvested) {
    stats.examined++;
    if (existing.has(sum.handle)) continue;

    const hit = matchPersonAdvisor(sum.advisors, aliases);
    const degree = classifyDegree(sum.dcTypes);
    const degreeName = await enrichProgram(sum);
    const engineering = isEngineeringProgram(degreeName);
    const gate = shouldRegister({ degree, engineering, isAdvisor: hit.ok });

    if (!gate.ok) {
      stats.skipped[gate.reason] = (stats.skipped[gate.reason] || 0) + 1;
      continue;
    }

    const authors = sum.authorsList.length ? sum.authorsList : splitAuthors(sum.authors);
    const studentName = authors[0] || sum.authors || "";
    const studentId = studentName ? estudianteIdFromName(studentName) : "";

    const row = {
      id: `tesis:${sum.handle}`,
      handle: sum.handle,
      title: sum.title,
      year: sum.year,
      degree,
      degree_name_ri: degreeName,
      item_url: sum.itemUrl,
      student_id: studentId,
      student_name: studentName,
      abstract_es: sum.abstractEs || "",
      source: "repositorio_unal",
      harvested_at: today(),
      visible: "yes",
    };
    theses.push(row);
    existing.add(sum.handle);
    stats.new++;
    stats.added.push({ handle: sum.handle, title: sum.title });
    console.log(`+ ${sum.handle} · ${studentName} · ${sum.title.slice(0, 50)}`);
    await sleep(80);
  }

  const students = rebuildStudentsFromTheses(theses);
  console.log("\nResumen:", JSON.stringify({ examined: stats.examined, new: stats.new, skipped: stats.skipped, students: students.length }, null, 2));

  await persist(theses, students, { dryRun: args.dryRun });

  if (holdout) {
    const got = theses.find((t) => t.id === holdout.id);
    const report = {
      ok: !!got,
      checks: [
        { name: "tesis_recreada", pass: !!got },
        { name: "student_nonempty", pass: !!(got?.student_id || got?.student_name) },
      ],
    };
    report.ok = report.checks.every((c) => c.pass);
    await writeFile(
      path.join(PIPELINE_TEST_DIR, "compare_report.json"),
      JSON.stringify(report, null, 2),
      "utf8",
    );
    console.log(report.ok ? "\nHoldout OK" : "\nHoldout FALLÓ");
    process.exitCode = report.ok ? 0 : 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
