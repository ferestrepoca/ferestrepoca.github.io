import { sleep, metaValues, metaFirst, yearFromDate } from "./normalize.mjs";

const BASE = "https://bffrepositorio.unal.edu.co/server/api";
const UA = "PlaSTest-harvest/1.0";

async function getJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/hal+json,application/json", "User-Agent": UA },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${url}\n${body.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Paginated discover search. Returns indexableObject-like items.
 */
export async function discoverSearch(query, { size = 50, maxPages = 40, delayMs = 120 } = {}) {
  const items = [];
  for (let page = 0; page < maxPages; page++) {
    const url =
      `${BASE}/discover/search/objects?query=${encodeURIComponent(query)}` +
      `&size=${size}&page=${page}`;
    const data = await getJson(url);
    const objects =
      data?._embedded?.searchResult?._embedded?.objects ||
      data?._embedded?.objects ||
      [];
    if (!objects.length) break;
    for (const obj of objects) {
      const item = obj?._embedded?.indexableObject || obj?.indexableObject || obj;
      if (item?.uuid || item?.handle) items.push(item);
    }
    const totalPages =
      data?._embedded?.searchResult?.page?.totalPages ??
      data?.page?.totalPages ??
      page + 1;
    if (page + 1 >= totalPages) break;
    await sleep(delayMs);
  }
  return items;
}

export async function fetchOwningCollectionName(uuid) {
  if (!uuid) return "";
  try {
    const data = await getJson(`${BASE}/core/items/${uuid}?embed=owningCollection`);
    return data?._embedded?.owningCollection?.name || "";
  } catch {
    return "";
  }
}

export function itemHandle(item) {
  return item?.handle || metaFirst(item?.metadata, "dc.identifier.uri")?.replace(/^.*handle\//, "") || "";
}

export function summarizeItem(item) {
  const md = item.metadata || {};
  const types = metaValues(md, "dc.type");
  const authors = metaValues(md, "dc.contributor.author");
  const advisors = metaValues(md, "dc.contributor.advisor");
  const abstracts = [
    ...metaValues(md, "dc.description.abstract"),
    ...metaValues(md, "dc.description"),
  ];
  // Prefer language-tagged if present
  const absEs = metaValues(md, "dc.description.abstract").filter((_, i, arr) => {
    const lang = md["dc.description.abstract"]?.[i]?.language;
    return !lang || String(lang).toLowerCase().startsWith("es");
  });
  const absEn = metaValues(md, "dc.description.abstract").filter((_, i) => {
    const lang = md["dc.description.abstract"]?.[i]?.language;
    return lang && String(lang).toLowerCase().startsWith("en");
  });

  return {
    uuid: item.uuid || item.id || "",
    handle: itemHandle(item),
    title: metaFirst(md, "dc.title") || item.name || "",
    authors: authors.join(" | "),
    authorsList: authors,
    advisors,
    dcTypes: types,
    year: yearFromDate(
      metaFirst(md, "dc.date.issued") ||
        metaFirst(md, "dc.date.available") ||
        metaFirst(md, "dc.date.accessioned")
    ),
    degreeName: metaFirst(md, "dc.description.degreename"),
    degreeLevel: metaFirst(md, "dc.description.degreelevel"),
    researchArea: metaValues(md, "dc.description.researcharea").join(" | "),
    abstractEs: absEs[0] || "",
    abstractEn: absEn[0] || "",
    abstractOther: abstracts.filter((a) => a && a !== absEs[0] && a !== absEn[0]).join("\n\n"),
    itemUrl: itemHandle(item)
      ? `https://repositorio.unal.edu.co/handle/${itemHandle(item)}`
      : metaFirst(md, "dc.identifier.uri") || "",
    raw: item,
  };
}
