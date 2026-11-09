# ferestrepoca.github.io

Sitio personal de [Felipe Restrepo Calle](https://ferestrepoca.github.io/).

## Publicación

GitHub Pages sirve el build de Astro (`web/dist`) vía [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

En el repo: **Settings → Pages → Source = GitHub Actions** (una sola vez).

## Desarrollo

Requisitos: Node ≥ 24 (ver `.nvmrc`).

```bash
npm ci --prefix web
npm run data:validate
npm test
npm run build     # validación JSON → astro build
npm run dev
npm run harvest:publications
npm run harvest:theses
```

Datos canónicos: `web/src/data/*.json` → detalle en [`docs/capa-datos-astro.md`](docs/capa-datos-astro.md).

**Cosecha automática:** [`.github/workflows/harvest.yml`](.github/workflows/harvest.yml) corre ambos harvest cada lunes (6:00 a. m. en Colombia) sobre la rama por defecto; también se puede lanzar en **Actions → Harvest → Run workflow**. Si hay registros nuevos y la validación, las pruebas y el build pasan, hace commit (`data: cosecha semanal …`, con la lista de lo agregado) y lanza el despliegue de Pages. Si una fuente falla, publica lo de la otra y el run queda en rojo.
