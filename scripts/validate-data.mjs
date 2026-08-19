#!/usr/bin/env node
import { readJson } from "./lib/json-store.mjs";
import { validateDataSet } from "./lib/data-validation.mjs";

const FILES = [
  "person",
  "publications",
  "theses",
  "students",
  "courses",
  "projects",
  "education",
  "postdocs",
  "languages",
  "intellectual_property",
];

async function main() {
  const entries = await Promise.all(FILES.map(async (name) => [name, await readJson(`${name}.json`)]));
  const data = Object.fromEntries(entries);
  validateDataSet(data);
  console.log(
    `JSON válido: ${data.publications.length} publicaciones, ${data.theses.length} tesis, ` +
      `${data.students.length} estudiantes, ${data.courses.length} cursos`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
