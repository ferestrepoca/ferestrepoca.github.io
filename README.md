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
