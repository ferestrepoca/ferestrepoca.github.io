# Auditoría: sitio personal de investigador y docente

**Sitio:** [ferestrepoca.github.io](https://ferestrepoca.github.io/)  
**Fecha de auditoría:** 13 de agosto de 2026  
**Alcance:** contenido, arquitectura de información, mantenibilidad técnica y oportunidades de mejora  
**Stack actual:** HTML estático bilingüe (ES/EN), CSS (plantilla ArcSin 2009 + `mi-estilo.css`), GitHub Pages, Google Analytics Universal (UA)

---

## 1. Veredicto

El sitio cumple bien como **vitrina académica clásica**: perfil institucional claro, listado amplio de publicaciones, proyectos representativos (UNCode, paradigmas, IRIS, SHE), historial docente y supervisión de estudiantes. Para un visitante que busca “quién es / qué investiga / qué enseña / cómo contactarlo”, la información esencial está.

El cuello de botella no es el diseño visual en sí, sino la **mantenibilidad**: cada actualización se multiplica por ~14 páginas HTML casi duplicadas (ES + EN), con cabeceras, menús, scripts y bloques de layout repetidos a mano. Eso explica desactualizaciones (cursos 2024-1 con pie de página “Febrero 2025”), páginas huérfanas (`extension.html`) y deuda técnica acumulada (XHTML 1.0, ancho fijo 920px, Analytics UA deprecado).

**Prioridad estratégica:** reducir el costo de actualizar publicaciones, cursos y estudiantes; después modernizar presentación y descubrimiento académico (ORCID/Scholar en portada, CV descargable, SEO por sección).

---

## 2. Inventario del sitio

| Área | Archivos | Observación |
|------|----------|-------------|
| Inicio | `index.html`, `index-en.html` | Perfil, proyectos destacados, cursos del semestre |
| Investigación | `investigacion.html`, `investigacion-en.html` | ~52 KB; publicaciones + proyectos; mayor costo de mantenimiento |
| Docencia | `docencia.html`, `docencia-en.html` | Historial por semestre; layout con alturas fijas |
| Estudiantes | `estudiantes.html`, `estudiantes-en.html` | Columnas flotantes con `height` fijo; algunos enlaces `href="#"` |
| CV | `cv.html`, `cv-en.html` | Formación, postdocs, PI, enlaces a perfiles académicos |
| SHE | `she.html`, `she-en.html` | Proyecto detallado (accesible desde investigación) |
| Extensión | `extension.html`, `extension-en.html` | Vacía; **fuera del menú** principal actual |
| Estilos | `style.css` (~656 líneas), `mi-estilo.css` (~25 líneas) | Plantilla 2009; sin media queries |
| Assets | `img/` (~380 KB) | Foto, logos UNCode/SHE/IRIS/Python; `UNCode_logo.png` es 1919×1210 para uso pequeño |

**Volumen aproximado:** ~14 páginas HTML, ~3900 líneas HTML, sin generador estático, sin datos estructurados (JSON/YAML/BibTeX).

---

## 3. Fortalezas (como sitio de investigador/docente)

1. **Cobertura funcional correcta** para el rol: investigación, docencia, estudiantes, CV y proyectos bandera.
2. **Publicaciones bien categorizadas** (libros, capítulos, revistas, conferencias) con DOIs y enlaces en buena parte de los ítems recientes.
3. **Bilingüismo ES/EN** real (no solo un selector vacío): útil para colaboradores internacionales y evaluación externa.
4. **Proyectos con narrativa y evidencia** (UNCode con repo; SHE con papers; IRIS/DUTO): comunica impacto más allá del listado bibliográfico.
5. **Enlaces a identidad académica** en CV (Scholar, ORCID, Scopus, CvLAC, ResearchGate, ResearcherID).
6. **Simplicidad de hosting:** GitHub Pages, sin backend; bajo riesgo operativo y fácil de versionar.
7. **Contacto institucional** visible (oficina, teléfono, correo ofuscado vía spamty).

---

## 4. Evaluación de mantenibilidad

### 4.1 Scorecard

| Dimensión | Nota (1–5) | Comentario |
|-----------|------------|------------|
| Facilidad de actualizar contenido | 2 | Cada cambio se hace en HTML crudo, a menudo en ES y EN |
| Duplicación / DRY | 1 | Header, nav, footer, Analytics y bloques de layout copiados en todas las páginas |
| Escalabilidad de publicaciones | 2 | `investigacion.html` ya es el archivo más grande; crece linealmente a mano |
| Consistencia ES ↔ EN | 2 | Riesgo alto de divergencia (ya hay diferencias menores y typos solo en ES) |
| Observabilidad / analytics | 1 | Universal Analytics (`UA-55496612-2`) está deprecado; medición probablemente rota |
| Accesibilidad y responsive | 2 | Sin `viewport`, ancho fijo 920px, layouts con floats y alturas fijas |
| SEO / discovery | 2 | Títulos idénticos en todas las páginas; meta descriptions genéricas |
| Pipeline / calidad | 1 | Sin linter, sin link check, sin CI, README mínimo |
| Adecuación al rol académico | 4 | Contenido rico; falta “capa de producto académico” (CV PDF, highlights, perfiles en home) |

### 4.2 Deuda estructural (raíz del problema)

El sitio es un **sitio estático de copia-pega**. El costo marginal de un cambio típico es alto:

| Cambio típico | Archivos a tocar hoy |
|---------------|----------------------|
| Nuevo paper | `investigacion.html` + `investigacion-en.html` (+ a veces home) |
| Cursos del semestre | `index.html` + `index-en.html` + `docencia.html` + `docencia-en.html` |
| Nuevo estudiante | `estudiantes.html` + `estudiantes-en.html` |
| Cambio de menú / Analytics / tipografía | Las 14 páginas |

Eso empuja a actualizaciones parciales (p. ej. pie “Febrero 2025” con cursos aún en **2024-1**).

### 4.3 Síntomas concretos de fricción

- **Layout frágil en Docencia/Estudiantes:** columnas con `float` y `height: NNN px` calibrados a ojo; un ítem más rompe el alineamiento.
- **CSS muerto / inconsistente:** `mi-estilo.css` referencia `img/yo-small.png` (no existe en el repo).
- **Página Extensión huérfana:** existe, está vacía (“Aún no hay proyectos…”), y el menú principal ya no la incluye (sí incluye Estudiantes).
- **Enlaces placeholder:** varios `href="#"` en estudiantes (tesis sin URL) y en selectores de idioma de la página actual.
- **Duplicación bilingüe sin fuente única:** no hay BibTeX/YAML/JSON del que se generen ambas lenguas.
- **`params.json`:** residual de generación antigua de GitHub Pages; apunta a una URL vieja (`dis.unal.edu.co/~ferestrepoca/`).

---

## 5. Contenido y frescura (rol académico)

### 5.1 Lo que un visitante académico espera vs. lo que encuentra

| Expectativa | Estado actual |
|-------------|----------------|
| Quién soy / afiliación / contacto | Bien en home |
| Áreas de investigación | Bien |
| Publicaciones recientes | Presentes hasta 2024; conviene verificar 2025–2026 |
| Cursos vigentes | Desactualizado (muestra 2024-1 en agosto 2026) |
| Estudiantes actuales / egresados | Presente; varios doctorados “Desde 2017/2020/2021” sin estado claro (en curso / defendida) |
| CV descargable (PDF) | Ausente; solo HTML resumido |
| Identificadores académicos en portada | Solo en CV (Scholar/ORCID no están en home) |
| News / highlights recientes | No hay sección de novedades |

### 5.2 Problemas de contenido puntuales

- Typo reiterado: **“ingestigación”** → debería ser “investigación” (`index.html`, `docencia.html`, varias ediciones).
- Selectores de idioma con `href="#"` en la lengua activa (aceptable UX, pero mejor `aria-current` o texto sin enlace).
- `extension.html` vacía y fuera de navegación: o se elimina, o se reincorpora con contenido real (educación continua / MLDS / divulgación).
- Imágenes pesadas para el uso: `UNCode_logo.png` (~56 KB, 1919×1210) se muestra a ~300px; conviene versiones optimizadas.
- Foto principal: `frc_pic.jpg` (~93 KB); existe `frc_pic_2013.jpg` sin uso aparente.

### 5.3 Narrativa académica

El sitio comunica dos líneas fuertes (educación en programación / UNCode y confiabilidad / SHE), pero en home las **áreas de interés** y los **proyectos** no priorizan un mensaje único (p. ej. “CS education + reliable embedded systems”). Una frase de posicionamiento corta bajo el nombre ayudaría a evaluadores, estudiantes potenciales y colaboradores.

---

## 6. Técnica, accesibilidad y descubrimiento

### 6.1 HTML / CSS

- DOCTYPE **XHTML 1.0 Transitional** (2000s); sin `<html lang="es">` / `lang="en"`.
- Ancho fijo `#site-wrapper { width: 920px; }` — ilegible en móvil sin zoom.
- Sin `@media` queries; tipografía base `font: normal 75%` (patrón de la era de layouts fijos).
- Uso intensivo de `<table>` para maquetar proyectos/cursos (semántica débil).
- Estilos inline frecuentes (`style="height:200px; margin-left:…"`), lo que dificulta un rediseño coherente.
- `favicon.ico` existe pero **no está referenciado** en el `<head>`.

### 6.2 Accesibilidad

- `alt` presentes en varias imágenes, pero genéricos (“Mi foto”).
- Contraste y foco: `:focus { outline: 0; }` en el reset del template elimina el anillo de foco (malo para teclado).
- Navegación por pestañas visuales sin indicar página actual de forma accesible (`aria-current="page"`).
- Sin skip-link real más allá de “ir arriba”.

### 6.3 SEO

- Todas las páginas comparten el mismo `<title>Felipe Restrepo Calle</title>` → mal para SERP y pestañas del navegador.
- Meta description útil solo en `index*`; el resto es genérica (“Página de…”).
- Sin Open Graph / Twitter cards (compartir en redes o Slack da preview pobre).
- Sin `sitemap.xml` / `robots.txt` explícitos (GitHub Pages puede indexar igual, pero no hay control).

### 6.4 Analytics y privacidad

- Google Analytics **Universal (`analytics.js`, propiedad UA-*)** dejó de procesar datos en julio 2023.
- El snippet se repite en las 14 páginas; migrar a GA4 (o Plausible/Umami) debería hacerse **una sola vez** vía include/parcial, no 14 veces.
- Dependencia de Google Fonts y spamty para el correo: revisar si el ofuscado sigue activo y si conviene un `mailto:` con texto parcial o formulario.

### 6.5 Enlaces y protocolos

- Decenas de `http://` (Scholar, ORCID, Springer antiguos, UNAL, etc.); muchos sitios redirigen, pero idealmente HTTPS canónico.
- Enlaces externos con `target="_blank"` sin `rel="noopener"` (detalle menor de seguridad).

---

## 7. Oportunidades de mejora (priorizadas)

### P0 — Bajo esfuerzo, alto impacto (días)

1. **Actualizar semestre vigente** en home + docencia (ES/EN) y alinear la fecha del pie.
2. Corregir typo **ingestigación**.
3. Enlazar **favicon**; añadir `lang` y títulos por página (`Investigación | Felipe Restrepo-Calle`, etc.).
4. Mostrar en home: ORCID + Google Scholar + (opcional) GitHub/grupo PLaS.
5. Decidir destino de **Extensión**: borrar del repo o poblarla y enlazarla.
6. Sustituir Analytics UA por GA4 **o** retirar el script hasta decidir herramienta.
7. Añadir PDF del CV (`cv.pdf`) y botón visible en home/CV.

### P1 — Reducir costo de mantenimiento (1–3 semanas)

8. **Extraer parciales** (header/nav/footer) con un generador estático mínimo:
   - Opciones pragmáticas: Eleventy, Hugo, o incluso un script Python/Jinja que emita los HTML actuales.
9. **Fuente única de datos** para:
   - publicaciones (BibTeX o YAML → listas ES/EN),
   - cursos por semestre,
   - estudiantes (programa, título, estado, URL repositorio).
10. Unificar navegación y eliminar divergencias (Extensión vs Estudiantes).
11. Sustituir layouts de alturas fijas por CSS Grid/Flexbox (una sola plantilla de “lista académica”).

### P2 — Experiencia y posicionamiento académico (iterativo)

12. **Responsive** real (breakpoint móvil para nav + tipografía + proyectos en stack).
13. Sección “Destacados” o “Novedades” (2–4 ítems: paper, curso, defensa, release UNCode).
14. Filtros simples en publicaciones (año / tipo) si el listado sigue creciendo; o enlazar Scholar/ORCID como canónico y mostrar solo top-N + BibTeX completo.
15. Mejorar página Estudiantes: estados (en curso / egresado), año de defensa, co-dirección.
16. Optimizar imágenes (WebP/avif o al menos JPEG/PNG redimensionados).
17. Meta OG + descriptions por sección; `sitemap.xml`.
18. Checklist de accesibilidad (foco visible, contraste, headings ordenados, `alt` descriptivos).

### P3 — Opcional / largo plazo

19. Dominio o path institucional estable documentado en README (evitar confusión con URLs históricas).
20. CI en GitHub Actions: link checker, HTML validate, build del generador.
21. Página de “Oportunidades” (tesis, monitorías, colaboración) si se busca atraer estudiantes.
22. Integración ligera con ORCID public API o exportación periódica desde Zotero/BibTeX (evitar doble mantenimiento con CvLAC/Scholar).

---

## 8. Escenarios de evolución (recomendación)

| Enfoque | Esfuerzo | Mantenibilidad | Cuándo tiene sentido |
|---------|----------|----------------|----------------------|
| **A. Parches al HTML actual** | Bajo | Sigue baja | Solo hotfixes de contenido este semestre |
| **B. Generador estático + datos** | Medio | Alta | **Recomendado** si el sitio se seguirá actualizando años |
| **C. Redesign completo (tema nuevo)** | Alto | Alta solo si va con B | Después de tener datos/parciales; no al revés |

**Recomendación:** no rediseñar primero. Primero **separar contenido de presentación** (B), aplicar P0 sobre la estructura actual o ya generada, y luego un rediseño responsive si se desea.

Para un sitio personal académico de este tamaño, Eleventy o Hugo con:

- `src/_data/publications.yaml` (o `.bib`),
- `courses.yaml`,
- `students.yaml`,
- layouts `base.njk` + i18n por carpeta `es/` / `en/`,

reduce el costo de “nuevo paper” a editar un registro y regenerar.

---

## 9. Checklist operativo sugerido (cada semestre)

- [ ] Actualizar bloque “asignaturas de este semestre” (home + docencia, ES/EN)
- [ ] Revisar estudiantes doctorado/maestría: altas, defensas, enlaces a repositorio
- [ ] Añadir publicaciones del período (o sincronizar desde BibTeX)
- [ ] Revisar enlaces rotos de Sites/MLDS del semestre anterior
- [ ] Actualizar “Última actualización” (o automatizarla en el build)
- [ ] Verificar que ORCID/Scholar/CvLAC sigan correctos

---

## 10. Conclusión

El sitio es una **buena base de contenido académico** atrapada en un **modelo de publicación de 2009**: HTML duplicado, plantilla de ancho fijo y sin pipeline. Como vitrina de investigador y docente ya comunica credibilidad; como sistema mantenible, castiga cada actualización y favorece el desfase (cursos, analytics, páginas huérfanas).

El mayor retorno no está en “hacerlo más bonito”, sino en **bajar el costo de mantenerlo al día** (datos + generador + parciales) y cerrar huecos de discovery académico (ORCID/Scholar en home, CV PDF, títulos/SEO, semestre vigente). Con eso, cualquier mejora visual posterior será barata de sostener.

---

## Anexo A — Mapa de navegación actual

```
Inicio ── Investigación ── Docencia ── Estudiantes ── CV
              │
              └── SHE (proyecto; no es ítem de menú)
              
Extensión (archivos presentes, menú desalineado / contenido vacío)
```

## Anexo B — Hallazgos técnicos rápidos

| Hallazgo | Evidencia |
|----------|-----------|
| Ancho fijo 920px | `#site-wrapper` en `style.css` |
| Sin responsive | No hay `@media` en CSS del sitio |
| Analytics deprecado | `UA-55496612-2` + `analytics.js` en todas las páginas |
| Mayor archivo | `investigacion.html` / `-en.html` (~52 KB) |
| Asset CSS roto | `mi-estilo.css` → `img/yo-small.png` inexistente |
| Favicon no enlazado | `favicon.ico` en raíz sin `<link rel="icon">` |
| Cursos desfasados | Etiquetas `2024-1` vs auditoría 2026-08 |
| Typo | “ingestigación” en docencia/home ES |

## Anexo C — Criterios usados

Auditoría orientada a sitio personal de **profesor universitario / investigador**, no a producto SaaS:

1. ¿Un estudiante potencial entiende en <60 s si hay fit de temas y cómo contactar?
2. ¿Un colega o evaluador encuentra publicaciones, proyectos e identificadores sin fricción?
3. ¿Actualizar el sitio cada semestre es un trabajo de minutos o de horas?
4. ¿El sitio es usable en el dispositivo con el que hoy navega la mayoría (móvil)?
5. ¿La presencia digital está alineada con perfiles canónicos (ORCID, Scholar, CvLAC)?
