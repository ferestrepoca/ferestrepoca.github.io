# Capa de datos Astro (sitio personal)

**Fecha:** 2026-08-13 (schema slim + CV + i18n)  
**Alcance:** datos canónicos en SQL → JSON → Astro. Público: GitHub Pages desde `web/dist` (Actions).

## Modelo slim

```text
person                   → ficha + afiliación + PLaS + áreas/urls (+ *_en)
education / postdocs / languages / IP  → CV (+ *_en)
publications             → obras ORCID (+ DOI HTML-only)
theses / students        → RI UNAL
courses                  → docencia histórica + actuales
projects                 → links_json + detail_json / detail_json_en
```

## i18n (sin rutas `/en/`)

- Mismas URLs; HTML incluye ES+EN (`data-lang` / componente `Bilingual`).
- [`web/public/scripts/lang.js`](../web/public/scripts/lang.js): `localStorage.siteLang` → `navigator.languages` → default `es`.
- Switcher ES|EN en el layout; override manual persiste.
- UI: [`web/src/i18n/ui.ts`](../web/src/i18n/ui.ts). Prosa editorial: campos `*_en` en seeds.

## Flujo

```text
data/sql/schema.sql + seed/*.sql
        │  npm run db:build
data/person.sqlite
        │  npm run data:export
web/src/data/*.json
        │  astro build
web/dist/
```

```bash
npm run harvest:publications   # ORCID → publications.sql (conserva html+crossref)
npm run harvest:theses         # RI UNAL → theses.sql + students.sql
npm run build
```

## Seeds versionados

| Archivo | Contenido |
|---------|-----------|
| `person.sql` | ficha + `rank_en`, `areas_json_en`, … |
| `education.sql` / `postdocs.sql` / `languages.sql` / `intellectual_property.sql` | CV bilingüe |
| `publications.sql` | obras + `authors_display` |
| `theses.sql` / `students.sql` | RI |
| `courses.sql` | docencia (labels de nivel vía UI) |
| `projects.sql` | `summary_en`, `detail_json_en`, `label_en` en links |

## Checklist semestral

1. Actualizar `courses.sql` (`current`, URLs, término).
2. `npm run harvest:publications`
3. `npm run harvest:theses`
4. Revisar proyectos / CV / campos `*_en` si aplica
5. `npm run build`

## Comandos

```bash
npm run db:build
npm run data:export
npm run harvest:publications
npm run harvest:theses
npm run dev
npm run build
npm run preview
```

Node ≥ 24 (`node:sqlite`).

## Deploy

Workflow [`.github/workflows/pages.yml`](../.github/workflows/pages.yml): `npm run build` → artifact `web/dist` → GitHub Pages.

## Fuera de alcance

Rediseño visual, prefijo `/en/` para SEO, admin UI.
