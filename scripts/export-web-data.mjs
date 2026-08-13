/**
 * Export SQLite slim → JSON for Astro.
 * Usage: npm run data:export
 */
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  buildDbFromSql,
  openDb,
  readTable,
  ROOT,
  PERSON_DOCENTE_ID,
} from "./lib/db.mjs";

const OUT = path.join(ROOT, "web", "src", "data");

async function writeJson(name, value) {
  await writeFile(path.join(OUT, name), JSON.stringify(value, null, 2) + "\n", "utf8");
  console.log(`  ${name} (${Array.isArray(value) ? value.length : 1})`);
}

function pick(row, keys) {
  const o = {};
  for (const k of keys) o[k] = row[k] ?? "";
  return o;
}

function parseJsonArray(raw, fallback = []) {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function bySort(a, b) {
  return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await buildDbFromSql({ quiet: true });
  const db = openDb();
  const personRow = readTable(db, "person").find((p) => p.id === PERSON_DOCENTE_ID);
  const pubs = readTable(db, "publications");
  const theses = readTable(db, "theses").filter((t) => t.visible !== "no");
  const students = readTable(db, "students");
  const courses = readTable(db, "courses");
  const projects = readTable(db, "projects").filter((p) => p.visible !== "no");
  const education = readTable(db, "education");
  const postdocs = readTable(db, "postdocs");
  const languages = readTable(db, "languages");
  const intellectualProperty = readTable(db, "intellectual_property");
  db.close();

  if (!personRow) throw new Error(`person missing: ${PERSON_DOCENTE_ID}`);

  const PROFILE_LINKS = [
    ["ORCID", "ORCID", "url_orcid"],
    ["Google Scholar", "Google Scholar", "url_scholar"],
    ["Scopus", "Scopus", "url_scopus"],
    ["Web of Science", "Web of Science", "url_researcherid"],
    ["OpenAlex", "OpenAlex", "url_openalex"],
    ["ResearchGate", "ResearchGate", "url_researchgate"],
    ["CvLAC", "CvLAC", "url_cvlac"],
    ["HERMES", "HERMES", "url_hermes"],
    ["Sitio web", "Website", "url_website"],
    ["LinkedIn", "LinkedIn", "url_linkedin"],
    ["GitHub", "GitHub", "url_github"],
  ];

  const person = {
    ...pick(personRow, [
      "id",
      "name_display",
      "name_sort",
      "email",
      "rank",
      "rank_en",
      "status",
      "office",
      "office_en",
      "phone",
      "orcid",
      "institution",
      "institution_en",
      "department",
      "department_en",
      "city",
      "country",
      "country_en",
      "group_name",
      "group_url",
    ]),
    image_path: personRow.image_path || "/img/frc_pic.jpg",
    areas: parseJsonArray(personRow.areas_json),
    areas_en: parseJsonArray(personRow.areas_json_en),
    aliases: parseJsonArray(personRow.aliases_json),
    profiles: PROFILE_LINKS.map(([label, label_en, key]) => ({
      label,
      label_en,
      url: personRow[key] || "",
    })).filter((x) => x.url),
  };

  const publicationsOut = pubs
    .map((p) => ({
      ...pick(p, [
        "id",
        "doi",
        "title",
        "year",
        "typology",
        "typology_label_es",
        "venue_title",
        "url",
        "identity_confidence",
      ]),
      authors: p.authors_display || "",
    }))
    .sort(
      (a, b) =>
        String(b.year).localeCompare(String(a.year)) || a.title.localeCompare(b.title),
    );

  const thesesOut = theses
    .map((t) => ({
      ...pick(t, [
        "id",
        "handle",
        "title",
        "year",
        "degree",
        "item_url",
        "student_id",
        "student_name",
      ]),
      advisor_ids: [PERSON_DOCENTE_ID],
    }))
    .sort(
      (a, b) =>
        String(b.year).localeCompare(String(a.year)) || a.title.localeCompare(b.title),
    );

  const studentsOut = students
    .map((s) => ({
      ...pick(s, ["id", "name_display", "name_sort", "degree_highest", "n_tesis"]),
      role_degree: s.thesis_degree || s.degree_highest || "",
      thesis: s.thesis_id
        ? {
            id: s.thesis_id,
            title: s.thesis_title,
            year: s.thesis_year,
            degree: s.thesis_degree,
            url: s.thesis_url,
          }
        : null,
      links: s.thesis_url
        ? [{ label: "Tesis", label_en: "Thesis", url: s.thesis_url }]
        : [],
    }))
    .sort((a, b) => a.name_sort.localeCompare(b.name_sort, "es"));

  const coursesOut = courses
    .map((c) => ({
      id: c.id,
      term: c.term || "",
      title: c.title,
      level: c.level || "",
      url: c.url || "",
      current: c.current === "yes" || c.current === "true",
      sort_order: Number(c.sort_order) || 0,
    }))
    .sort(
      (a, b) =>
        Number(b.current) - Number(a.current) ||
        String(b.term).localeCompare(String(a.term)) ||
        a.sort_order - b.sort_order ||
        a.title.localeCompare(b.title, "es"),
    );

  const projectsOut = projects
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title_short: p.title_short,
      title_short_en: p.title_short_en || p.title_short,
      title_full: p.title_full || p.title_short,
      title_full_en: p.title_full_en || p.title_full || p.title_short,
      summary: p.summary || "",
      summary_en: p.summary_en || p.summary || "",
      detail: parseJsonArray(p.detail_json),
      detail_en: parseJsonArray(p.detail_json_en),
      links: parseJsonArray(p.links_json),
      sort_order: Number(p.sort_order) || 0,
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.title_short.localeCompare(b.title_short, "es"));

  const educationOut = education
    .map((e) => ({
      ...pick(e, [
        "id",
        "degree_level",
        "title",
        "title_en",
        "institution",
        "institution_en",
        "place",
        "place_en",
        "year",
        "thesis_title",
        "thesis_url",
        "honors",
        "honors_en",
        "extra_url",
        "extra_label",
        "extra_label_en",
      ]),
      sort_order: Number(e.sort_order) || 0,
    }))
    .sort(bySort);

  const postdocsOut = postdocs
    .map((p) => ({
      ...pick(p, [
        "id",
        "institution",
        "project",
        "project_en",
        "place",
        "place_en",
        "date_from",
        "date_to",
      ]),
      sort_order: Number(p.sort_order) || 0,
    }))
    .sort(bySort);

  const languagesOut = languages
    .map((l) => ({
      ...pick(l, ["id", "name", "name_en", "level", "level_en", "certificate"]),
      sort_order: Number(l.sort_order) || 0,
    }))
    .sort(bySort);

  const ipOut = intellectualProperty
    .map((i) => ({
      ...pick(i, [
        "id",
        "kind",
        "title",
        "title_en",
        "description",
        "description_en",
        "creators",
        "rights_holder",
        "rights_holder_en",
        "year",
        "registry",
        "registry_en",
        "url",
        "url_source",
      ]),
      sort_order: Number(i.sort_order) || 0,
    }))
    .sort(bySort);

  const meta = {
    exported_at: new Date().toISOString().slice(0, 10),
    source: "data/sql → person.sqlite (slim)",
    docente_id: PERSON_DOCENTE_ID,
    counts: {
      publications: publicationsOut.length,
      theses: thesesOut.length,
      students: studentsOut.length,
      courses: coursesOut.length,
      projects: projectsOut.length,
      education: educationOut.length,
      postdocs: postdocsOut.length,
      languages: languagesOut.length,
      intellectual_property: ipOut.length,
    },
  };

  console.log("export →", path.relative(ROOT, OUT));
  await writeJson("person.json", person);
  await writeJson("publications.json", publicationsOut);
  await writeJson("theses.json", thesesOut);
  await writeJson("students.json", studentsOut);
  await writeJson("courses.json", coursesOut);
  await writeJson("projects.json", projectsOut);
  await writeJson("education.json", educationOut);
  await writeJson("postdocs.json", postdocsOut);
  await writeJson("languages.json", languagesOut);
  await writeJson("intellectual_property.json", ipOut);
  await writeJson("meta.json", meta);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
