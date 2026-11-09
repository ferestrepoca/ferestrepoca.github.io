#!/usr/bin/env node
/**
 * Markdown list of publications and theses added since the last commit
 * (working tree vs HEAD). Used by the harvest workflow for the commit message.
 */
import { execFileSync } from "node:child_process";
import { readJson } from "./lib/json-store.mjs";

function committed(name) {
  try {
    return JSON.parse(execFileSync("git", ["show", `HEAD:web/src/data/${name}`], { encoding: "utf8" }));
  } catch {
    return [];
  }
}

const lines = [];
for (const [name, label, describe] of [
  ["publications.json", "Publicación", (r) => `${r.title} (${r.year})`],
  ["theses.json", "Tesis", (r) => `${r.title} — ${r.student_name} (${r.year})`],
]) {
  const before = new Set(committed(name).map((r) => r.id));
  for (const row of await readJson(name)) {
    if (!before.has(row.id)) lines.push(`- ${label}: ${describe(row)}`);
  }
}
console.log(lines.join("\n"));
