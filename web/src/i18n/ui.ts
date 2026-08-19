/**
 * UI copy ES/EN (nav, headings, labels).
 * Content prose lives in SQL *_en fields.
 */
export const ui = {
  es: {
    nav_home: "Inicio",
    nav_pubs: "Publicaciones",
    nav_theses: "Tesis",
    nav_students: "Estudiantes",
    nav_teaching: "Docencia",
    nav_projects: "Proyectos",
    nav_cv: "CV",
    nav_aria: "Principal",
    footer: "Capa de datos Astro (shell). Diseño final pendiente.",
    photo_alt: "Foto de",
    areas: "Áreas",
    group: "Grupo",
    current_courses: "Cursos actuales",
    featured_projects: "Proyectos destacados",
    course_site: "Sitio del curso",
    open: "Abrir",
    current: "actual",
    teaching: "Docencia",
    teaching_source: "Fuente",
    other_mooc: "Otros / MOOC",
    publications: "Publicaciones",
    publications_blurb: "obras (cosecha ORCID / Crossref).",
    theses: "Tesis dirigidas",
    theses_blurb: "tesis (RI UNAL, advisor ferestrepoca).",
    year: "Año",
    degree: "Grado",
    title: "Título",
    student: "Estudiante",
    students: "Estudiantes",
    students_blurb: "autores de tesis dirigidas.",
    projects: "Proyectos",
    curriculum: "Curriculum",
    education: "Formación",
    postdocs: "Postdoctorados",
    languages: "Idiomas",
    ip: "Propiedad intelectual",
    patents: "Patentes",
    software: "Software",
    identifiers: "Identificadores",
    interest_areas: "Áreas de interés",
    thesis: "Tesis",
    available: "Disponible",
    source_code: "Código",
    meta_exported: "Datos actualizados",
    meta_pubs: "pubs",
    meta_theses: "tesis",
    meta_students: "estudiantes",
    meta_courses: "cursos",
    level_pregrado: "pregrado",
    level_maestria: "maestría",
    level_doctorado: "doctorado",
    level_educacion_continua: "educación continua",
    level_mooc: "MOOC",
    degree_pregrado: "pregrado",
    degree_maestria: "maestría",
    degree_doctorado: "doctorado",
    role_phd: "Estudiante de doctorado",
    role_msc: "Estudiante de maestría",
    lang_switch: "Idioma",
  },
  en: {
    nav_home: "Home",
    nav_pubs: "Publications",
    nav_theses: "Theses",
    nav_students: "Students",
    nav_teaching: "Teaching",
    nav_projects: "Projects",
    nav_cv: "CV",
    nav_aria: "Main",
    footer: "Astro data layer (shell). Final design pending.",
    photo_alt: "Photo of",
    areas: "Fields",
    group: "Group",
    current_courses: "Current courses",
    featured_projects: "Featured projects",
    course_site: "Course site",
    open: "Open",
    current: "current",
    teaching: "Teaching",
    teaching_source: "Source",
    other_mooc: "Other / MOOC",
    publications: "Publications",
    publications_blurb: "works (ORCID / Crossref harvest).",
    theses: "Supervised theses",
    theses_blurb: "theses (UNAL repository, advisor ferestrepoca).",
    year: "Year",
    degree: "Degree",
    title: "Title",
    student: "Student",
    students: "Students",
    students_blurb: "authors of supervised theses.",
    projects: "Projects",
    curriculum: "Curriculum",
    education: "Education",
    postdocs: "Post-doctoral positions",
    languages: "Languages",
    ip: "Intellectual property",
    patents: "Patents",
    software: "Software",
    identifiers: "Identifiers",
    interest_areas: "Fields of interest",
    thesis: "Thesis",
    available: "Available",
    source_code: "Source code",
    meta_exported: "Data updated",
    meta_pubs: "pubs",
    meta_theses: "theses",
    meta_students: "students",
    meta_courses: "courses",
    level_pregrado: "undergraduate",
    level_maestria: "master's",
    level_doctorado: "PhD",
    level_educacion_continua: "continuing education",
    level_mooc: "MOOC",
    degree_pregrado: "undergraduate",
    degree_maestria: "master's",
    degree_doctorado: "PhD",
    role_phd: "PhD student",
    role_msc: "Master's student",
    lang_switch: "Language",
  },
};

export const typologyLabel = {
  journal_article: { es: "Artículos de revista", en: "Journal articles" },
  conference_paper: { es: "Artículos en conferencia", en: "Conference papers" },
  book_chapter: { es: "Capítulos de libros", en: "Book chapters" },
  preprint: { es: "Preprint / working paper", en: "Preprint / working paper" },
  other: { es: "Otros", en: "Other" },
};

export function levelKey(level) {
  const n = String(level || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (n.includes("continu")) return "level_educacion_continua";
  if (n.includes("mooc")) return "level_mooc";
  if (n.includes("doctor")) return "level_doctorado";
  if (n.includes("maestr") || n.includes("master")) return "level_maestria";
  if (n.includes("pregrad") || n.includes("undergrad")) return "level_pregrado";
  return "";
}

export function degreeKey(degree) {
  const n = String(degree || "").toLowerCase();
  if (n.includes("doctor")) return "degree_doctorado";
  if (n.includes("maestr") || n.includes("master")) return "degree_maestria";
  if (n.includes("pregrad") || n.includes("undergrad")) return "degree_pregrado";
  return "";
}
