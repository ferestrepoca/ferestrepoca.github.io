/**
 * The four research areas (person.json `areas`, same order) and the keywords
 * used to place publications, theses and projects in them at build time.
 * An item can belong to several areas; one with no match only shows under "all".
 * To fix a misplaced item, adjust the keywords here.
 */
export const AREAS = [
  {
    id: "educacion",
    label: { es: "Educación en programación", en: "Programming education" },
    keywords: [
      "educa", "learn", "aprend", "teach", "enseñ", "student", "estudiant", "course", "curso",
      "motiva", "mooc", "gamif", "pedagog", "tutor", "self-regulat", "autorregul", "classroom",
      "aula", "academic performance", "rendimiento", "competence", "competencia", "novice",
      "plagiar", "feedback", "retroaliment", "evaluación automática", "automatic assessment",
      "engineering education", "curricul", "asistente virtual", "university", "universidad",
    ],
  },
  {
    id: "datos",
    label: { es: "Ciencia de datos y ML", en: "Data science & ML" },
    keywords: [
      "machine learning", "aprendizaje automático", "aprendizaje de máquina", "data", "datos",
      "predict", "predic", "analytics", "analítica", "neural", "deep learning", "classif",
      "clasific", "language model", "modelos de lenguaje", "llm", "embedding", "mining",
      "minería", "visualiz", "clustering", "inteligencia artificial", "artificial intelligence",
      "generative", "generativa", "genai", "knowledge graph", "grafo", "ai-generated",
      "monitoring", "monitoreo", "thematic analysis", "análisis temático",
    ],
  },
  {
    id: "lenguajes",
    label: { es: "Lenguajes y análisis de código", en: "Languages & code analysis" },
    keywords: [
      "programming language", "lenguaje de programación", "lenguajes de programación", "compil",
      "parser", "grammar", "gramática", "source code", "código fuente", "code analysis",
      "análisis de código", "análisis automático", "static analysis", "domain-specific",
      "dsl", "natural language", "lenguaje natural", "paradigm", "software architecture",
      "arquitectura", "security", "seguridad", "program synthesis", "code generation",
      "procesador de lenguaje", "procesadores de lenguaje", "language processor", "transaction", "legibilidad", "readability",
    ],
  },
  {
    id: "confiabilidad",
    label: { es: "Sistemas confiables", en: "Dependable systems" },
    keywords: [
      "fault", "fallo", "falla", "soft error", "radiation", "radiación", "reliab",
      "confiab", "dependab", "embedded", "embebid", "microprocessor", "microprocesador",
      "approximate", "aproximad", "harden", "single event", "seu", "tolerant", "toleran",
      "error detection", "detección de errores", "fpga", "co-design", "codiseño", "co-diseño",
      "softerror", "processor", "register file", "swift", "reconfigurable", "multi-core",
      "device", "industrial",
    ],
  },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];

function normalize(text: string) {
  return text.toLowerCase().normalize("NFC");
}

/** Area ids whose keywords appear in the given texts. */
export function areasFor(...texts: Array<string | undefined | null>): AreaId[] {
  const haystack = normalize(texts.filter(Boolean).join(" \n "));
  return AREAS.filter((area) => area.keywords.some((keyword) => haystack.includes(keyword))).map(
    (area) => area.id,
  );
}
