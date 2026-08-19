# Capa de datos JSON

Los archivos de `web/src/data/` son la única fuente de datos del sitio. Astro los importa directamente durante el build; no existe una base de datos ni una etapa de exportación.

## Flujo

```text
ORCID + Crossref ── npm run harvest:publications ──→ publications.json
RI UNAL ─────────── npm run harvest:theses ────────→ theses.json + students.json

web/src/data/*.json ── npm run data:validate ──→ astro build ──→ web/dist/
```

Los harvesters leen primero el JSON versionado, fusionan la respuesta remota, validan el resultado completo y reemplazan los archivos mediante escrituras temporales. `--dry-run` ejecuta la cosecha sin escribir.

## Archivos canónicos

| Archivo | Contenido | Mantenimiento |
|---------|-----------|---------------|
| `person.json` | Perfil, afiliación, aliases e identificadores | Manual |
| `publications.json` | Publicaciones y metadatos ORCID/Crossref | Harvester + correcciones manuales |
| `theses.json` | Tesis dirigidas y metadatos del RI | Harvester |
| `students.json` | Proyección materializada de las tesis | Regenerado por `harvest:theses` |
| `courses.json` | Docencia histórica y cursos actuales | Manual |
| `projects.json` | Proyectos y enlaces bilingües | Manual |
| `education.json`, `postdocs.json`, `languages.json`, `intellectual_property.json` | CV | Manual |

Los años se conservan como texto. Booleanos como `current` y `visible`, contadores y `sort_order` usan tipos JSON nativos. `harvest_sources` y `orcid_put_codes` son arreglos.

## Garantías

`npm run data:validate` comprueba:

- IDs, DOI, handles y slugs únicos;
- tipos y campos obligatorios;
- referencias entre estudiantes y tesis;
- URLs utilizables, sin placeholders `#`;
- metadatos necesarios para repetir una cosecha sin pérdida.

Las publicaciones con fuente `html`/`manual` o notas manuales están protegidas: una cosecha ORCID puede enriquecerlas, pero no eliminarlas ni reemplazar su clasificación editorial.

## Comandos

```bash
npm run data:validate
npm test
npm run harvest:publications
npm run harvest:publications -- --dry-run
npm run harvest:theses
npm run harvest:theses -- --dry-run
npm run dev
npm run build
npm run preview
```

## Checklist semestral

1. Actualizar `web/src/data/courses.json`, incluyendo `current`, término y URL.
2. Ejecutar ambos harvesters.
3. Revisar el diff de los JSON.
4. Ejecutar `npm test && npm run build`.
5. Revisar proyectos y campos bilingües del CV.

## Deploy

GitHub Actions instala las dependencias web, ejecuta las pruebas y la validación, construye Astro y publica `web/dist` en GitHub Pages.
