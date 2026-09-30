import { setWorkerUrl } from "maplibre-gl";

let done = false;
/** Call once before creating any map. */
export function initMaplibre() {
  if (done || typeof window === "undefined") return;
  setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
  done = true;
}
