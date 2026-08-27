import test from "node:test";
import assert from "node:assert/strict";
import { matchesPublication, normalizeText } from "../../web/public/scripts/publications-filter.js";

const publication = {
  search: "Análisis de código Felipe Restrepo 2024 IEEE Access 10.1234/example",
  typology: "journal_article",
  year: "2024",
};

test("la búsqueda ignora mayúsculas y tildes", () => {
  assert.equal(normalizeText("ANÁLISIS"), "analisis");
  assert.equal(matchesPublication(publication, { query: "analisis", typology: "", year: "" }), true);
});

test("la búsqueda incluye autor, venue y DOI", () => {
  assert.equal(matchesPublication(publication, { query: "felipe", typology: "", year: "" }), true);
  assert.equal(matchesPublication(publication, { query: "ieee access", typology: "", year: "" }), true);
  assert.equal(matchesPublication(publication, { query: "10.1234", typology: "", year: "" }), true);
});

test("los filtros se combinan", () => {
  assert.equal(matchesPublication(publication, {
    query: "código",
    typology: "journal_article",
    year: "2024",
  }), true);
  assert.equal(matchesPublication(publication, {
    query: "código",
    typology: "conference_paper",
    year: "2024",
  }), false);
});
