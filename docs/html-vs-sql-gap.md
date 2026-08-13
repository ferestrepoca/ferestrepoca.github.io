# Gap analysis: HTML legacy vs SQL slim

**DB temporal:** [`data/pipeline_test/html_gap_analysis.sqlite`](../data/pipeline_test/html_gap_analysis.sqlite)  
**Generado:** 2026-08-13 · **Actualizado:** 2026-08-13 (gaps cerrados en seeds)

## Inventario (post-cierre)

| Fuente | Conteo |
|--------|--------|
| SQL person | 1 (+ afiliación + PLaS) |
| SQL education / postdocs / languages / IP | 3 / 2 / 3 / 4 |
| SQL courses | ~70 (histórico docencia.html) |
| SQL publications | 74 (+ 3 DOI solo-HTML) |
| SQL projects | 5 (SHE con `detail_json`) |
| SQL students / theses | 26 / 26 |

## Decisiones

| Tema | Decisión |
|------|----------|
| Google Scholar | Canónico SQL: `gDt_gQ0AAAAJ`. HTML legacy `4CsXFG8AAAAJ` descartado. |
| DOI solo-HTML | Añadidos: `10.58459/rptel.2024.19015`, `10.3389/fpsyg.2019.02843`, `10.26507/paper.2212`. ITS LATAM ya estaba en SQL. |
| CV | Tablas `education`, `postdocs`, `languages`, `intellectual_property`. |
| SHE | Detalle largo en `projects.detail_json` (misma fila). |
| Afiliación | Campos en `person`: institution, department, city, country, group_*. |

## Hallazgos originales (cerrados)

### ~~[high] courses_incomplete~~ → cerrado

Cursos históricos importados desde `docencia.html` a `courses.sql` (~70 filas). Typo `ingestigación` → `investigación`.

### ~~[high] cv_missing_in_sql~~ → cerrado

Formación, postdocs, idiomas, propiedad intelectual y perfiles viven en seeds + página Astro `cv.astro`.

### ~~[high] ip_software_missing~~ → cerrado

Tabla `intellectual_property` (patente + UNCode / PicoHard / IRIS).

### ~~[high] affiliation / PLaS / SHE detail~~ → cerrado

Campos en `person` + `detail_json` en fila `project:she`.

### ~~[medium] html_only_dois~~ → cerrado

3 DOI añadidos vía Crossref; el 4.º ya existía.

### [info] scholar_id_mismatch → no-op

Sin cambio: se mantiene el Scholar del SQL.

## Pendiente / fuera de alcance

- Prefijo `/en/` (SEO/share); i18n actual = toggle + auto-detect del navegador.
- Cutover HTML→Astro: **hecho** (HTML legacy eliminado; Pages vía Actions → `web/dist`).

## Harvest ORCID (merge)

`scripts/harvest-publications.mjs` ahora:

1. Reconstruye SQLite desde seeds antes de cosechar (baseline = SQL versionado).
2. Trata como protegidas las filas con `html` en `harvest_sources` o notes.
3. Fusiona fuentes (`html+crossref` + ORCID → `html+orcid+crossref`) sin borrar notas.
4. Conserva pubs protegidas no vistas en ORCID; aborta si alguna faltara al escribir.
