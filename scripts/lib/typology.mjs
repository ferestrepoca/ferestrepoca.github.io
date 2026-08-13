/** Map Crossref / ORCID work types → canonical typology. */

const CROSSREF_MAP = {
  "journal-article": "journal_article",
  "proceedings-article": "conference_paper",
  "conference-paper": "conference_paper",
  "book-chapter": "book_chapter",
  book: "book",
  monograph: "book",
  "edited-book": "book",
  "reference-book": "book",
  "posted-content": "preprint",
  preprint: "preprint",
  dissertation: "thesis",
  report: "report",
  other: "report",
  "peer-review": "report",
  dataset: "report",
  "journal-issue": "report",
  "book-part": "book_chapter",
  "book-section": "book_chapter",
};

const LABELS_ES = {
  journal_article: "Artículos de revista",
  conference_paper: "Artículos en conferencia",
  book_chapter: "Capítulos de libros",
  book: "Libros",
  preprint: "Preprint / working paper",
  software: "Software",
  thesis: "Tesis",
  report: "Informe / otro",
  unknown: "Sin clasificar",
};

export function typologyFromCrossref(type) {
  const raw = (type || "").trim().toLowerCase();
  const typology = CROSSREF_MAP[raw] || (raw ? "unknown" : "unknown");
  return {
    typology,
    typology_label_es: LABELS_ES[typology] || LABELS_ES.unknown,
    typology_source: raw ? "crossref_type" : "unknown",
    typology_raw: type || "",
  };
}

export function typologyFromOrcid(type) {
  const raw = (type || "").trim().toLowerCase();
  // ORCID uses similar tokens often
  const mapped = CROSSREF_MAP[raw] || CROSSREF_MAP[raw.replace(/_/g, "-")];
  const typology = mapped || "unknown";
  return {
    typology,
    typology_label_es: LABELS_ES[typology] || LABELS_ES.unknown,
    typology_source: raw ? "orcid_type" : "unknown",
    typology_raw: type || "",
  };
}

export function labelEs(typology) {
  return LABELS_ES[typology] || LABELS_ES.unknown;
}
