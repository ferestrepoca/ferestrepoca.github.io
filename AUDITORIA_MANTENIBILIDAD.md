# Auditoría de mantenibilidad

**Repositorio:** `ferestrepoca.github.io`  
**Fecha de revisión:** 12 de agosto de 2026  
**Alcance:** código y activos versionados del sitio estático. No se comprobaron por red la disponibilidad de enlaces externos ni la configuración efectiva de GitHub Pages.

## Resumen ejecutivo

El sitio es pequeño, completamente estático y sencillo de publicar, pero su mantenimiento depende hoy de editar a mano catorce documentos HTML muy similares. La deuda principal está en la duplicación de la plantilla y del contenido bilingüe, el HTML/CSS heredado, y la falta de validación automatizada. Esto eleva el riesgo de que un cambio rutinario (menú, cabecera, pie, curso o enlace) quede aplicado sólo en parte de las páginas o idiomas.

La recomendación es conservar la simplicidad de un sitio estático, pero introducir un generador estático con plantillas y datos estructurados, modernizar gradualmente el marcado y añadir controles de calidad en cada cambio.

## Inventario observado

| Elemento | Hallazgo |
| --- | --- |
| Páginas | 14 HTML: 7 en español y 7 en inglés; unas 3.900 líneas en total. |
| Estilos | Dos hojas CSS (`style.css`, 656 líneas; `mi-estilo.css`, 25 líneas) más 235 atributos `style` dentro del HTML. |
| Automatización | No hay `package.json`, generador estático, pruebas, linter, workflow de GitHub Actions ni guía de contribución. |
| Contenido recurrente | Cabecera, navegación, selector de idioma, pie y script de analítica se repiten en todas las páginas. |
| Enlaces | 435 aperturas con `target="_blank"`; 148 URL `http://`; 34 enlaces con `href="#"` y 2 vacíos. |

## Hallazgos priorizados

### P0 — Corregir referencias locales ausentes y enlaces de marcador

Seis imágenes referenciadas desde CSS no están en `img/`: `comment-arrow.gif`, `comment-reply.gif`, `icon-feed.gif`, `main-two-columns-left.gif`, `main-two-columns.gif` y `yo-small.png`. Aunque algunas reglas pueden no usarse hoy, cualquier clase que las active producirá solicitudes 404. También se encontraron enlaces de marcador usados como destinos reales, por ejemplo en publicaciones y tesis, y enlaces vacíos en los listados docentes.

**Impacto:** fallos visibles al reutilizar estilos, enlaces que no llevan al recurso esperado y ruido durante el diagnóstico.

**Acción:** eliminar reglas no utilizadas o añadir los activos necesarios; sustituir cada marcador por una URL definitiva o por texto sin enlace; añadir un verificador de enlaces internos en integración continua.

**Evidencia:** `mi-estilo.css:16`, `style.css:61`, `docencia.html:229`, `docencia.html:254`, `investigacion.html:143` y `estudiantes.html:88`.

### P1 — Eliminar la duplicación de plantillas y de contenido bilingüe

Cada idioma está materializado en archivos independientes (`index.html`/`index-en.html`, etc.). La cabecera, menú, pie, CSS, fuente y analítica se repiten; los listados de cursos, publicaciones y estudiantes también se duplican como HTML. Una corrección global exige localizar y editar numerosos puntos.

**Impacto:** divergencia entre idiomas, actualizaciones incompletas y revisiones de cambios difíciles.

**Acción:** migrar a un generador estático ligero compatible con GitHub Pages (Jekyll) o a Eleventy. Extraer `header`, navegación, selector de idioma, pie y analítica a _includes/layouts_. Guardar las listas repetitivas en datos YAML/JSON y conservar únicamente el texto traducible por idioma.

**Criterio de éxito:** un cambio de menú, datos de contacto o pie se realiza en un solo archivo; cada página se genera a partir de una plantilla común.

### P1 — Separar presentación de contenido y sustituir layout frágil

Hay 235 estilos en línea, 24 etiquetas `<center>` y estructuras basadas en tablas, flotantes y alturas fijas. Ejemplos: el encabezado aparece estilizado directamente en todas las páginas y las secciones de estudiantes/docencia dependen de bloques con alturas de hasta `1450px`.

**Impacto:** un ajuste visual obliga a editar contenido; las alturas fijas se rompen al cambiar texto, traducciones o tamaño de pantalla.

**Acción:** definir componentes CSS con flexbox/grid, mover estilos repetidos a una única hoja moderna, usar clases semánticas y permitir que el contenido determine la altura. Eliminar reglas heredadas y clases no utilizadas tras comprobar su cobertura.

**Evidencia:** `index.html:26-27`, `estudiantes.html:86`, `docencia.html:84` y `style.css`.

### P1 — Modernizar HTML, accesibilidad y diseño adaptable

Las páginas declaran XHTML 1.0 Transitional, no incluyen `lang` ni `meta viewport`. La validación con `tidy` informa entre 3 y 146 diagnósticos por página; abundan cierres XHTML inconsistentes, anidamientos de enlaces que el validador repara implícitamente y elementos obsoletos. La estructura usa principalmente `<div>` y tablas en lugar de `header`, `nav`, `main`, `section` y listas/encabezados coherentes.

**Impacto:** mayor coste al hacer cambios responsive y menor fiabilidad de la base de código; además se dificulta la accesibilidad y el SEO internacional.

**Acción:** adoptar `<!doctype html>` y HTML5, declarar `lang="es"`/`lang="en"`, añadir `viewport`, usar regiones semánticas, revisar jerarquía de encabezados y comprobar contraste/teclado. Configurar un validador HTML en CI para impedir regresiones.

**Evidencia:** `index.html:1-3`, `index.html:5-12`; ninguna de las 14 páginas contiene `lang` ni `viewport`.

### P1 — Centralizar políticas de enlaces externos y dependencias de terceros

Las 435 aperturas en pestaña nueva carecen de `rel="noopener noreferrer"`. Hay 148 referencias `http://` —incluidas fuentes de Google y enlaces institucionales— y cuatro páginas cargan la fuente por HTTP. La analítica Universal Analytics se copia en 14 páginas mediante `analytics.js`, una integración heredada que conviene revisar antes de modificarla.

**Impacto:** cambios repetitivos, advertencias de contenido mixto en contextos no redirigidos a HTTPS y una política de seguridad inconsistente.

**Acción:** usar siempre HTTPS donde el destino lo soporte, centralizar el componente de enlace externo para añadir `rel`, y decidir explícitamente si se retira, migra o deja de cargar la analítica. Añadir `preconnect` a fuentes si se mantienen y documentar cada dependencia externa.

**Evidencia:** `extension.html:12`, `she.html:12`, `docencia.html:280`, y los bloques de analítica al final de cada página.

### P2 — Separar datos editoriales de la maqueta

Cursos, publicaciones, proyectos y estudiantes están escritos como fragmentos HTML extensos. Las páginas docentes y de estudiantes son especialmente grandes y contienen información repetida entre columnas, periodos e idiomas.

**Impacto:** actualizar un semestre o añadir una publicación requiere manipular marcado complejo y aumenta la posibilidad de errores de formato, enlaces omitidos y desalineación de traducciones.

**Acción:** modelar los datos en archivos YAML/JSON con campos como `periodo`, `titulo`, `nivel`, `url`, `idioma`, `estado` y `orden`; generar listas y tablas desde plantillas. Establecer un pequeño procedimiento editorial en el README.

### P2 — Incorporar calidad mínima reproducible y documentación del repositorio

El README sólo enlaza al sitio. No existen instrucciones para editar, previsualizar, validar, desplegar o actualizar datos; tampoco hay convenciones para enlaces, idiomas, imágenes o fechas.

**Impacto:** la continuidad del sitio depende del conocimiento implícito de quien lo edita y los errores se descubren tarde.

**Acción:** ampliar el README con requisitos, comandos de vista previa y despliegue, mapa de contenido y checklist editorial. Añadir `.editorconfig`, un formateador HTML/CSS, validación HTML y comprobación de enlaces internos en GitHub Actions. Incluir una política simple para imágenes (formato, tamaño y atributo `alt`).

### P2 — Mejorar actualización y trazabilidad del contenido

La portada declara “Última actualización: Febrero 2025”, mientras los cursos destacados son del periodo 2024-1. El año/periodo se repite en varios archivos y puede quedar desactualizado aun si se edita otra sección.

**Impacto:** información que parece vigente pero no lo está; más puntos de actualización manual.

**Acción:** definir un único dato `updated_at` y un conjunto de datos para el periodo actual, mostrarlo automáticamente en la plantilla y añadir una revisión semestral de enlaces/contenido.

**Evidencia:** `index.html:166-182`, `index-en.html:160-176`.

## Hoja de ruta sugerida

1. **Estabilización (corto plazo):** resolver recursos ausentes y enlaces vacíos/marcadores; forzar HTTPS; añadir `rel` a enlaces externos; actualizar periodo y fecha visible.
2. **Base mantenible (siguiente iteración):** introducir HTML5, `lang`, `viewport`, CSS responsive y componentes de cabecera/pie; eliminar estilos en línea de forma incremental.
3. **Reducción estructural de deuda:** adoptar un generador estático, convertir cabecera/pie/navegación en plantillas y mover listas editoriales a datos.
4. **Prevención continua:** documentar el flujo y activar CI para formato, validación HTML y enlaces internos antes de publicar.

## Verificación realizada

Se inspeccionaron todos los archivos versionados, referencias locales de CSS/HTML y patrones de markup. Se ejecutó `tidy -qe` sobre las 14 páginas como diagnóstico no modificador. No se aplicaron cambios al sitio ni se validaron enlaces externos por red.
