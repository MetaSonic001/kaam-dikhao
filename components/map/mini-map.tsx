"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { initMaplibre } from "@/lib/maplibre";
import { LngLatBounds, Map as MlMap, Marker, NavigationControl } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { Layers, Satellite } from "lucide-react";
import { useT } from "@/lib/i18n";
import { STATUS_META } from "@/lib/meta";
import { cn } from "@/lib/utils";
import type { SiteStatus } from "@/lib/types";

type Pin = { lat: number; lng: number; label?: string; color?: string };

/** Focused map for one project: its mapped geometry, evidence pins, optional satellite basemap. */
export function MiniMap({ lat, lng, geometry, status, pins = [], className }: {
  lat: number; lng: number; geometry?: GeoJSON.Geometry | null; status: SiteStatus; pins?: Pin[]; className?: string;
}) {
  const t = useT();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [sat, setSat] = useState(false);
  const color = STATUS_META[status]?.color ?? "#f97316";

  useEffect(() => {
    if (!el.current) return;
    initMaplibre();
    const m = new MlMap({ container: el.current, style: "https://tiles.openfreemap.org/styles/positron", center: [lng, lat], zoom: 15, cooperativeGestures: true, attributionControl: { compact: true } });
    map.current = m;
    m.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    m.on("load", () => {
      const b = new LngLatBounds([lng, lat], [lng, lat]);
      if (geometry) {
        m.addSource("geom", { type: "geojson", data: { type: "Feature", properties: {}, geometry } });
        m.addLayer({ id: "geom-casing", type: "line", source: "geom", paint: { "line-color": "#fff", "line-width": 9 }, layout: { "line-cap": "round", "line-join": "round" } });
        m.addLayer({ id: "geom", type: "line", source: "geom", paint: { "line-color": color, "line-width": 5 }, layout: { "line-cap": "round", "line-join": "round" } });
        const walk = (c: unknown): void => { if (Array.isArray(c) && typeof c[0] === "number") b.extend(c as [number, number]); else if (Array.isArray(c)) c.forEach(walk); };
        walk((geometry as GeoJSON.LineString).coordinates);
      }
      const home = document.createElement("div");
      home.style.cssText = `width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)`;
      new Marker({ element: home }).setLngLat([lng, lat]).addTo(m);
      for (const p of pins) {
        const d = document.createElement("div");
        d.title = p.label ?? "";
        d.style.cssText = "width:12px;height:12px;border-radius:50%;background:#16805a;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)";
        new Marker({ element: d }).setLngLat([p.lng, p.lat]).addTo(m);
        b.extend([p.lng, p.lat]);
      }
      if (!b.isEmpty() && (geometry || pins.length)) m.fitBounds(b, { padding: 50, maxZoom: 17, duration: 0 });
    });
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const go = () => {
      if (m.getLayer("sat")) m.removeLayer("sat");
      if (m.getSource("sat")) m.removeSource("sat");
      if (sat) {
        m.addSource("sat", { type: "raster", tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg"], tileSize: 256, maxzoom: 13, attribution: "Sentinel-2 cloudless 2024 © EOX IT Services GmbH (contains modified Copernicus Sentinel data)" });
        const first = m.getStyle().layers.find((l) => l.type !== "background")?.id;
        m.addLayer({ id: "sat", type: "raster", source: "sat" }, first);
      }
      for (const l of m.getStyle().layers) if (["fill", "background"].includes(l.type)) m.setLayoutProperty(l.id, "visibility", sat ? "none" : "visible");
    };
    if (m.isStyleLoaded()) go(); else m.once("load", go);
  }, [sat]);

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-line", className)}>
      <div className="absolute inset-0"><div ref={el} className="size-full" role="application" aria-label={t("map.aria")} /></div>
      <div className="absolute right-2 top-2 z-10 flex overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
        <button onClick={() => setSat(false)} className={cn("flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold", !sat ? "bg-navy text-white" : "text-ink-2")}><Layers className="size-3.5" />{t("map.map")}</button>
        <button onClick={() => setSat(true)} className={cn("flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold", sat ? "bg-navy text-white" : "text-ink-2")}><Satellite className="size-3.5" />{t("map.satellite")}</button>
      </div>
    </div>
  );
}
