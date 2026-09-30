// MapLibre v6 runs its tile worker as an ES module. Bundlers mangle its URL, so we serve it from /public.
import { copyFileSync, mkdirSync } from "node:fs";
const src = "node_modules/maplibre-gl/dist";
mkdirSync("public/maplibre", { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(`${src}/${f}`, `public/maplibre/${f}`);
