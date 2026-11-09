/**
 * Topics inside each research area, for the topic graph in "Research".
 * Publications and theses are placed in topics by keywords in their title
 * (and venue, for publications). To move an item, adjust the keywords here.
 */
import type { AreaId } from "./areas";

export type Topic = {
  id: string;
  area: AreaId;
  label: { es: string; en: string };
  keywords: string[];
};

export const TOPICS: Topic[] = [
  // Programming education
  {
    id: "aprender-programar",
    area: "educacion",
    label: { es: "Enseñanza de la programación", en: "Teaching programming" },
    keywords: ["programación de computadores", "computer programming", "programming course", "curso de programación", "novice", "learn programming", "aprendizaje de la programación", "programming education", "introductory programming", "investigación educativa", "aula de ingeniería", "engineering education", "laboratorio", "aprendizaje de un lenguaje"],
  },
  {
    id: "autorregulacion",
    area: "educacion",
    label: { es: "Autorregulación y motivación", en: "Self-regulation & motivation" },
    keywords: ["self-regulat", "autorregul", "motiva", "metacogn"],
  },
  {
    id: "analitica-aprendizaje",
    area: "educacion",
    label: { es: "Analítica del aprendizaje", en: "Learning analytics" },
    keywords: ["learning analytics", "analítica del aprendizaje", "academic performance", "rendimiento académico", "early intervention", "intervención temprana"],
  },
  {
    id: "juegos",
    area: "educacion",
    label: { es: "Juegos y gamificación", en: "Games & gamification" },
    keywords: ["gamif", "videojuego", "video game", "serious game", "juego"],
  },
  {
    id: "ia-aula",
    area: "educacion",
    label: { es: "IA generativa en el aula", en: "Generative AI in class" },
    keywords: ["generative", "generativa", "genai", "large language model", "grandes modelos de lenguaje", "llm", "asistente virtual", "tutoring", "ai-generated"],
  },
  // Data science & ML
  {
    id: "machine-learning",
    area: "datos",
    label: { es: "Machine learning", en: "Machine learning" },
    keywords: ["machine learning", "aprendizaje automático", "aprendizaje de máquina", "predict", "predic", "classif", "clasific", "neural", "deep learning", "mining", "minería", "artificial intelligence", "inteligencia artificial", "agentes autónomos", "recomendaci"],
  },
  {
    id: "pln",
    area: "datos",
    label: { es: "Procesamiento de lenguaje", en: "Language processing" },
    keywords: ["natural language", "lenguaje natural", "procesamiento de lenguaje", "nlp", "text mining", "thematic analysis", "análisis temático", "language model", "modelos de lenguaje"],
  },
  {
    id: "grafos-conocimiento",
    area: "datos",
    label: { es: "Grafos de conocimiento", en: "Knowledge graphs" },
    keywords: ["knowledge graph", "grafo de conocimiento", "ontolog"],
  },
  {
    id: "visualizacion",
    area: "datos",
    label: { es: "Análisis y visualización", en: "Analysis & visualization" },
    keywords: ["visualiz", "data analysis", "análisis de datos", "monitoring", "monitoreo"],
  },
  // Languages & code analysis
  {
    id: "analisis-codigo",
    area: "lenguajes",
    label: { es: "Análisis de código", en: "Code analysis" },
    keywords: ["code analysis", "análisis de código", "source code", "código fuente", "static analysis", "análisis estático", "abstract interpretation", "legibilidad", "readability"],
  },
  {
    id: "evaluacion-automatica",
    area: "lenguajes",
    label: { es: "Evaluación automática", en: "Automated assessment" },
    keywords: ["automatic assessment", "automated assessment", "evaluación automática", "casos de prueba", "test case", "online judge", "juez", "programming contest", "plagiar", "feedback", "retroaliment", "uncode", "grading", "calificación automática", "realimentación", "student assessment"],
  },
  {
    id: "arquitectura-seguridad",
    area: "lenguajes",
    label: { es: "Arquitectura y seguridad", en: "Architecture & security" },
    keywords: ["software architecture", "arquitectura", "security", "seguridad"],
  },
  {
    id: "lenguajes-paradigmas",
    area: "lenguajes",
    label: { es: "Lenguajes y paradigmas", en: "Languages & paradigms" },
    keywords: ["programming language", "lenguaje de programación", "lenguajes de programación", "paradigm", "compil", "domain-specific", "dsl", "grammar", "gramática"],
  },
  // Dependable systems
  {
    id: "soft-errors",
    area: "confiabilidad",
    label: { es: "Errores por radiación", en: "Radiation soft errors" },
    keywords: ["soft error", "softerror", "radiation", "radiación", "single event", "seu", "set mitigation"],
  },
  {
    id: "computacion-aproximada",
    area: "confiabilidad",
    label: { es: "Computación aproximada", en: "Approximate computing" },
    keywords: ["approximate", "aproximad"],
  },
  {
    id: "endurecimiento",
    area: "confiabilidad",
    label: { es: "Endurecimiento de software", en: "Software hardening" },
    keywords: ["harden", "swift", "mitigation", "mitigación", "error detection", "detección de errores", "fault injection", "inyección de fallos", "control flow", "data flow", "fault toleran", "tolerantes a fallos"],
  },
  {
    id: "embebidos",
    area: "confiabilidad",
    label: { es: "Sistemas embebidos", en: "Embedded systems" },
    keywords: ["embedded", "embebid", "microprocessor", "microprocesador", "processor", "fpga", "co-design", "codiseño", "co-diseño", "reconfigurable", "device", "industrial"],
  },
];

/** Topic ids whose keywords appear in the given texts. */
export function topicsFor(...texts: Array<string | undefined | null>): string[] {
  const haystack = texts.filter(Boolean).join(" \n ").toLowerCase();
  return TOPICS.filter((topic) => topic.keywords.some((keyword) => haystack.includes(keyword))).map((t) => t.id);
}
