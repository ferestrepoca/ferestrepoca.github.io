// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://ferestrepoca.github.io",
  output: "static",
  // These sections now live as tabs on the home page; old links land on their tab.
  redirects: {
    "/docencia": "/#docencia",
    "/tesis": "/#estudiantes",
    "/proyectos": "/#proyectos",
    "/lineas-investigacion": "/#investigacion",
  },
});
