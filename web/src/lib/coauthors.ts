/**
 * Coauthor helpers over the `authors` strings of publications.json
 * ("Given Family; Given Family; …", as they come from ORCID/Crossref).
 */

type Publication = { authors?: string };

function tokens(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[-.\u2010-\u2015]/g, " ")
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

/** Split a name into given and family tokens; accepts "Family, Given" or "Given Family". */
function parts(name: string): { given: string[]; family: string[] } {
  if (name.includes(",")) {
    const [family, given] = name.split(",", 2);
    return { given: tokens(given), family: tokens(family) };
  }
  const all = tokens(name);
  // Without a comma, assume Spanish-style double surname when there are 4+ tokens.
  const familyCount = all.length >= 4 ? 2 : 1;
  return { given: all.slice(0, -familyCount), family: all.slice(-familyCount) };
}

export function authorsOf(publication: Publication): string[] {
  return String(publication.authors || "")
    .split(";")
    .map((a) => a.trim())
    .filter(Boolean);
}

/**
 * Publications coauthored by a student: every surname of the student appears in
 * the author name, and the author's first given initial is one of the student's.
 */
export function publicationsWithStudent(publications: Publication[], studentName: string): number {
  const student = parts(studentName);
  if (!student.family.length) return 0;
  const initials = new Set(student.given.map((g) => g[0]));
  return publications.filter((publication) =>
    authorsOf(publication).some((name) => {
      const author = tokens(name);
      return (
        student.family.every((surname) => author.includes(surname)) && initials.has(author[0]?.[0] ?? "")
      );
    }),
  ).length;
}
