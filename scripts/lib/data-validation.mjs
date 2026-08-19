const DEGREE_VALUES = new Set(["maestria", "doctorado"]);
const CONFIDENCE_VALUES = new Set(["A", "B", "C", "D", "E"]);

function fail(message) {
  throw new Error(`Data validation failed: ${message}`);
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
}

function requireArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} must be a non-empty string`);
}

function unique(rows, field, label, { allowEmpty = false } = {}) {
  const seen = new Set();
  for (const [index, row] of rows.entries()) {
    const value = row?.[field];
    if (!allowEmpty || value) requireString(value, `${label}[${index}].${field}`);
    if (!value) continue;
    const key = String(value).toLowerCase();
    if (seen.has(key)) fail(`${label} has duplicate ${field}: ${value}`);
    seen.add(key);
  }
}

function validateUrl(value, label) {
  if (value == null || value === "") return;
  if (typeof value !== "string" || value === "#") fail(`${label} is not a usable URL`);
  if (value.startsWith("/")) return;
  try {
    const url = new URL(value);
    if (!new Set(["http:", "https:", "mailto:"]).has(url.protocol)) fail(`${label} has unsupported protocol`);
  } catch {
    fail(`${label} is not a valid URL: ${value}`);
  }
}

function validateUrls(value, path = "data") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateUrls(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if ((key === "url" || key.endsWith("_url") || key === "image_path") && typeof child === "string") {
      validateUrl(child, childPath);
    } else {
      validateUrls(child, childPath);
    }
  }
}

export function validatePerson(person) {
  requireObject(person, "person");
  requireString(person.id, "person.id");
  requireString(person.name_display, "person.name_display");
  requireString(person.orcid, "person.orcid");
  requireArray(person.aliases, "person.aliases");
  if (!person.aliases.length) fail("person.aliases must not be empty");
  validateUrls(person, "person");
}

export function validatePublications(publications) {
  requireArray(publications, "publications");
  unique(publications, "id", "publications");
  unique(publications, "doi", "publications", { allowEmpty: true });
  for (const [index, publication] of publications.entries()) {
    requireString(publication.title, `publications[${index}].title`);
    requireString(publication.year, `publications[${index}].year`);
    requireString(publication.authors, `publications[${index}].authors`);
    requireArray(publication.harvest_sources, `publications[${index}].harvest_sources`);
    requireArray(publication.orcid_put_codes, `publications[${index}].orcid_put_codes`);
    if (!CONFIDENCE_VALUES.has(publication.identity_confidence)) {
      fail(`publications[${index}].identity_confidence is invalid`);
    }
  }
  validateUrls(publications, "publications");
}

export function validateTheses(theses) {
  requireArray(theses, "theses");
  unique(theses, "id", "theses");
  unique(theses, "handle", "theses");
  for (const [index, thesis] of theses.entries()) {
    requireString(thesis.title, `theses[${index}].title`);
    requireString(thesis.year, `theses[${index}].year`);
    requireString(thesis.student_id, `theses[${index}].student_id`);
    requireString(thesis.student_name, `theses[${index}].student_name`);
    requireArray(thesis.advisor_ids, `theses[${index}].advisor_ids`);
    if (!DEGREE_VALUES.has(thesis.degree)) fail(`theses[${index}].degree is invalid`);
    if (typeof thesis.visible !== "boolean") fail(`theses[${index}].visible must be boolean`);
  }
  validateUrls(theses, "theses");
}

export function validateStudents(students, theses) {
  requireArray(students, "students");
  unique(students, "id", "students");
  const thesisIds = new Set(theses.map((thesis) => thesis.id));
  const thesisCountsByStudent = new Map();
  for (const thesis of theses.filter((item) => item.visible !== false)) {
    thesisCountsByStudent.set(thesis.student_id, (thesisCountsByStudent.get(thesis.student_id) || 0) + 1);
  }
  const studentIds = new Set(students.map((student) => student.id));
  for (const [index, student] of students.entries()) {
    requireString(student.name_display, `students[${index}].name_display`);
    if (!Number.isInteger(student.n_tesis) || student.n_tesis < 1) {
      fail(`students[${index}].n_tesis must be a positive integer`);
    }
    if (student.thesis && !thesisIds.has(student.thesis.id)) {
      fail(`students[${index}] references missing thesis ${student.thesis.id}`);
    }
    if (student.n_tesis !== thesisCountsByStudent.get(student.id)) {
      fail(`students[${index}].n_tesis does not match theses`);
    }
  }
  for (const thesis of theses.filter((item) => item.visible !== false)) {
    if (!studentIds.has(thesis.student_id)) fail(`${thesis.id} references missing student ${thesis.student_id}`);
  }
  validateUrls(students, "students");
}

function validateOrderedCollection(rows, label) {
  requireArray(rows, label);
  unique(rows, "id", label);
  for (const [index, row] of rows.entries()) {
    if ("sort_order" in row && !Number.isFinite(row.sort_order)) {
      fail(`${label}[${index}].sort_order must be a number`);
    }
  }
  validateUrls(rows, label);
}

export function validateDataSet(data) {
  validatePerson(data.person);
  validatePublications(data.publications);
  validateTheses(data.theses);
  validateStudents(data.students, data.theses);
  for (const [index, thesis] of data.theses.entries()) {
    if (!thesis.advisor_ids.includes(data.person.id)) fail(`theses[${index}] does not reference person.id`);
  }

  validateOrderedCollection(data.courses, "courses");
  for (const [index, course] of data.courses.entries()) {
    if (typeof course.current !== "boolean") fail(`courses[${index}].current must be boolean`);
  }

  validateOrderedCollection(data.projects, "projects");
  unique(data.projects, "slug", "projects");
  validateOrderedCollection(data.education, "education");
  validateOrderedCollection(data.postdocs, "postdocs");
  validateOrderedCollection(data.languages, "languages");
  validateOrderedCollection(data.intellectual_property, "intellectual_property");
  return data;
}
