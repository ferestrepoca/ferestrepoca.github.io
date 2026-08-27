export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase();
}

export function matchesPublication(publication, filters) {
  const query = normalizeText(filters.query).trim();
  return (!query || normalizeText(publication.search).includes(query))
    && (!filters.typology || publication.typology === filters.typology)
    && (!filters.year || publication.year === filters.year);
}

function initializePublicationFilters() {
  const form = document.querySelector("#publication-filters");
  const rows = [...document.querySelectorAll(".publication-item")];
  const status = document.querySelector("#publication-results");
  const empty = document.querySelector("#publication-empty");
  if (!form || !status || !empty) return;

  const controls = {
    query: form.elements.namedItem("query"),
    typology: form.elements.namedItem("typology"),
    year: form.elements.namedItem("year"),
  };

  function currentLanguage() {
    return document.documentElement.lang === "en" ? "en" : "es";
  }

  function syncLocalizedControls() {
    const language = currentLanguage();
    const placeholder = controls.query.dataset[`placeholder${language === "en" ? "En" : "Es"}`];
    if (placeholder) controls.query.placeholder = placeholder;
    form.querySelectorAll("option[data-label-es]").forEach((option) => {
      option.textContent = option.dataset[`label${language === "en" ? "En" : "Es"}`];
    });
  }

  function applyFilters() {
    const filters = {
      query: controls.query.value,
      typology: controls.typology.value,
      year: controls.year.value,
    };
    let visible = 0;

    rows.forEach((row) => {
      const matches = matchesPublication(row.dataset, filters);
      row.hidden = !matches;
      if (matches) visible += 1;
    });

    const language = currentLanguage();
    status.textContent = language === "en"
      ? `${visible} of ${rows.length} publications`
      : `${visible} de ${rows.length} publicaciones`;
    empty.hidden = visible !== 0;
  }

  form.addEventListener("input", applyFilters);
  form.addEventListener("change", applyFilters);
  form.addEventListener("reset", () => setTimeout(applyFilters, 0));

  new MutationObserver(() => {
    syncLocalizedControls();
    applyFilters();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  syncLocalizedControls();
  applyFilters();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePublicationFilters);
  } else {
    initializePublicationFilters();
  }
}
