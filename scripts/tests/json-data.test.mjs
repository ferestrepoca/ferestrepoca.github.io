import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { writeJsonBatch } from "../lib/json-store.mjs";
import { validateDataSet, validatePublications } from "../lib/data-validation.mjs";
import { harvestPublications, isProtectedPub, mergeHarvestSources, mergePutCodes } from "../harvest-publications.mjs";
import { harvestTheses, rebuildStudentsFromTheses } from "../harvest-theses.mjs";

test("the committed JSON dataset is valid", async () => {
  const names = ["person", "publications", "theses", "students", "courses", "projects", "education", "postdocs", "languages", "intellectual_property"];
  const entries = await Promise.all(names.map(async (name) => [name, JSON.parse(await readFile(path.join("web/src/data", `${name}.json`), "utf8"))]));
  assert.doesNotThrow(() => validateDataSet(Object.fromEntries(entries)));
});

test("validation rejects duplicate publication IDs", () => {
  const publication = {
    id: "pub:test", doi: "", title: "Test", year: "2026", authors: "Author",
    identity_confidence: "C", harvest_sources: ["manual"], orcid_put_codes: [], url: "",
  };
  assert.throws(() => validatePublications([publication, { ...publication }]), /duplicate id/);
});

test("JSON writes are stable and skip unchanged files", async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "site-json-"));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  assert.deepEqual(await writeJsonBatch([["sample.json", [{ id: "a" }]]], { dataDir }), ["sample.json"]);
  assert.deepEqual(await writeJsonBatch([["sample.json", [{ id: "a" }]]], { dataDir }), []);
  assert.equal(await readFile(path.join(dataDir, "sample.json"), "utf8"), '[\n  {\n    "id": "a"\n  }\n]\n');
});

test("publication merge helpers use JSON arrays and preserve manual records", () => {
  assert.deepEqual(mergeHarvestSources(["html", "crossref"], ["orcid", "crossref"]), ["html", "orcid", "crossref"]);
  assert.deepEqual(mergePutCodes(["9"], "2|9"), ["2", "9"]);
  assert.equal(isProtectedPub({ harvest_sources: ["html"] }), true);
  assert.equal(isProtectedPub({ harvest_sources: ["manual_inventory"] }), true);
  assert.equal(isProtectedPub({ harvest_sources: ["orcid"], notes: "manual correction" }), true);
});

test("publication harvester writes the canonical JSON directly", async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "site-harvest-"));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  const person = { id: "docente:ferestrepoca", name_display: "Felipe Restrepo Calle", orcid: "0000-0003-4226-1324", aliases: ["Felipe Restrepo Calle"] };
  const baseline = [{
    id: "pub:doi:10.1/test", doi: "10.1/test", title: "Manual title", year: "2025",
    date_issued: "2025", typology: "journal_article", typology_label_es: "Artículo",
    venue_title: "Venue", authors: "Felipe Restrepo Calle", publisher_name: "", url: "https://doi.org/10.1/test",
    identity_confidence: "B", harvest_sources: ["html"], orcid_put_codes: [], harvested_at: "2025-01-01", notes: "manual",
  }];
  await writeJsonBatch([["person.json", person], ["publications.json", baseline]], { dataDir });

  const result = await harvestPublications({
    dataDir,
    sleep: async () => {},
    getOrcidWorks: async () => [{ doi: "10.1/test", title: "Remote title", year: "2025", type: "journal-article", putCode: 7 }],
    getCrossrefWork: async () => ({
      title: ["Remote title"], type: "journal-article", URL: "https://doi.org/10.1/test",
      published: { "date-parts": [[2025]] }, author: [{ given: "Felipe", family: "Restrepo Calle", ORCID: "https://orcid.org/0000-0003-4226-1324" }],
    }),
  });
  assert.deepEqual(result.written, ["publications.json"]);
  const saved = JSON.parse(await readFile(path.join(dataDir, "publications.json"), "utf8"));
  assert.equal(saved[0].title, "Manual title");
  assert.deepEqual(saved[0].harvest_sources, ["html", "orcid", "crossref"]);
  assert.deepEqual(saved[0].orcid_put_codes, ["7"]);
});

test("students are deterministically rebuilt from theses", () => {
  const base = {
    handle: "unal/1", title: "One", year: "2024", degree: "maestria", degree_name_ri: "Ingeniería",
    item_url: "https://example.test/1", student_id: "student:one", student_name: "One, Student",
    advisor_ids: ["docente:ferestrepoca"], abstract_es: "", source: "ri", harvested_at: "2024-01-01", visible: true,
  };
  const students = rebuildStudentsFromTheses([
    { ...base, id: "tesis:1" },
    { ...base, id: "tesis:2", handle: "unal/2", title: "Two", year: "2026", degree: "doctorado", item_url: "https://example.test/2" },
  ]);
  assert.equal(students.length, 1);
  assert.equal(students[0].n_tesis, 2);
  assert.equal(students[0].degree_highest, "doctorado");
  assert.equal(students[0].thesis.id, "tesis:2");
});

test("thesis harvester writes theses and the student projection directly", async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), "site-theses-"));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  const person = { id: "docente:ferestrepoca", name_display: "Felipe Restrepo Calle", orcid: "0000-0003-4226-1324", aliases: ["Restrepo Calle, Felipe"] };
  await writeJsonBatch([["person.json", person], ["theses.json", []]], { dataDir });

  const result = await harvestTheses({
    dataDir,
    queryDelayMs: 0,
    itemDelay: async () => {},
    getProgram: async () => "Maestría en Ingeniería de Sistemas",
    getHarvested: async () => [{
      handle: "unal/999", title: "Nueva tesis", year: "2026", dcTypes: ["Tesis de maestría"],
      advisors: ["Restrepo Calle, Felipe"], authorsList: ["Student, Test"], authors: "Student, Test",
      itemUrl: "https://repositorio.unal.edu.co/handle/unal/999", abstractEs: "Resumen",
    }],
  });

  assert.deepEqual(result.written.sort(), ["students.json", "theses.json"]);
  const theses = JSON.parse(await readFile(path.join(dataDir, "theses.json"), "utf8"));
  const students = JSON.parse(await readFile(path.join(dataDir, "students.json"), "utf8"));
  assert.equal(theses[0].id, "tesis:unal/999");
  assert.equal(students[0].thesis.id, "tesis:unal/999");
});
