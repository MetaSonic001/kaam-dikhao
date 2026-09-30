"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { initMaplibre } from "@/lib/maplibre";
import { Map as MlMap, Marker, NavigationControl, type GeoJSONSource, type MapMouseEvent } from "maplibre-gl";
import { Layers, Locate, Satellite } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge, CategoryChip } from "../badges";
import { API, qs } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { MAP_STATUS_LEGEND, STATUS_META } from "@/lib/meta";
import { cn } from "@/lib/utils";
import type { Category, SiteStatus } from "@/lib/types";
import type { MsgKey } from "@/lib/messages";

const STYLE = "https://tiles.openfreemap.org/styles/positron";
export const SAT_YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

const eox = (y: number) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${y}_3857/default/g/{z}/{y}/{x}.jpg`;
const gibsDate = () => new Date(Date.now() - 36 * 3600 * 1000).toISOString().slice(0, 10);
const gibs = () => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${gibsDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

const statusColor: unknown[] = ["match", ["get", "status"], ...Object.entries(STATUS_META).flatMap(([k, v]) => [k, v.color]), "#7c8890"];

export type MapSite = {
  id: string; slug: string; title: string; category: Category; status: SiteStatus;
  locality: string | null; city: string | null; evidence_count: number; expected_completion: string | null;
};

type Props = {
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  className?: string;
  statuses?: SiteStatus[];
  categories?: Category[];
  q?: string;
  city?: string;
  controls?: boolean;
  year?: number | null; // when set, satellite mode is on with that year
  onYearChange?: (y: number | null) => void;
  onSelect?: (s: MapSite | null) => void;
  onMove?: (c: { lat: number; lng: number; zoom: number }) => void;
  onLocate?: (c: { lat: number; lng: number }) => void;
  selectedSlug?: string | null;
  showCard?: boolean;
  scrollZoom?: boolean;
  flyTo?: { lat: number; lng: number; zoom?: number; nonce: number } | null;
};

export function KdMap({
  center = [19.076, 72.8777], zoom = 11, className, statuses, categories, q, controls = true, year, onYearChange,
  onSelect, onMove, onLocate, selectedSlug, showCard = true, scrollZoom = true, flyTo,
}: Props) {
  const t = useT();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const userMarker = useRef<Marker | null>(null);
  const [picked, setPicked] = useState<MapSite | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [layerMenu, setLayerMenu] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const cb = useRef({ onSelect, onMove });
  useEffect(() => { cb.current = { onSelect, onMove }; });
  const satOn = year !== undefined && year !== null;

  const filter = useMemo(() => {
    const f: unknown[] = ["all"];
    if (statuses?.length) f.push(["in", ["get", "status"], ["literal", statuses]]);
    if (categories?.length) f.push(["in", ["get", "category"], ["literal", categories]]);
    return f;
  }, [statuses, categories]);

  const load = useCallback(async () => {
    const m = map.current;
    if (!m || !ready.current) return;
    const b = m.getBounds();
    const bbox = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].join(",");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/map${qs({ bbox, geom: m.getZoom() >= 11.5, q, city: undefined })}`, { cache: "no-store" });
      const fc = (await res.json()) as GeoJSON.FeatureCollection;
      const pts = fc.features.filter((f) => f.geometry.type === "Point");
      const lines = fc.features.filter((f) => f.geometry.type !== "Point");
      (m.getSource("sites") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: pts });
      (m.getSource("lines") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: lines });
      setCount(pts.length);
    } catch {
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, [q]);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });

  // -- init
  useEffect(() => {
    if (!el.current) return;
    initMaplibre();
    const m = new MlMap({ container: el.current, style: STYLE, center: [center[1], center[0]], zoom, attributionControl: { compact: true }, cooperativeGestures: !scrollZoom });
    map.current = m;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __kdmap?: MlMap }).__kdmap = m;
    m.on("error", (e) => console.warn("[map]", e.error?.message ?? e));
    m.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

    m.on("load", () => {
      m.addSource("sites", { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterMaxZoom: 12, clusterRadius: 44 });
      m.addSource("lines", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "lines-casing", type: "line", source: "lines", paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.9 }, layout: { "line-cap": "round", "line-join": "round" } });
      m.addLayer({ id: "lines", type: "line", source: "lines", paint: { "line-color": statusColor as never, "line-width": 4 }, layout: { "line-cap": "round", "line-join": "round" } });
      m.addLayer({ id: "clusters", type: "circle", source: "sites", filter: ["has", "point_count"], paint: { "circle-color": "#08243a", "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 40, 26], "circle-stroke-width": 3, "circle-stroke-color": "rgba(255,255,255,.9)" } });
      m.addLayer({ id: "cluster-count", type: "symbol", source: "sites", filter: ["has", "point_count"], layout: { "text-field": "{point_count_abbreviated}", "text-size": 12, "text-font": ["Noto Sans Bold"] }, paint: { "text-color": "#fff" } });
      m.addLayer({ id: "evidence-ring", type: "circle", source: "sites", filter: ["all", ["!", ["has", "point_count"]], [">", ["get", "evidence_count"], 0]], paint: { "circle-radius": 14, "circle-color": "rgba(22,128,90,.12)", "circle-stroke-color": "#16805a", "circle-stroke-width": 2 } });
      m.addLayer({ id: "points", type: "circle", source: "sites", filter: ["!", ["has", "point_count"]], paint: { "circle-color": statusColor as never, "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 14, 9], "circle-stroke-width": 2.5, "circle-stroke-color": "#ffffff" } });
      m.addLayer({ id: "selected", type: "circle", source: "sites", filter: ["==", ["get", "slug"], ""], paint: { "circle-radius": 15, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#08243a", "circle-stroke-width": 3 } });
      ready.current = true;
      void loadRef.current();
    });

    let timer: ReturnType<typeof setTimeout>;
    m.on("moveend", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { void loadRef.current(); const c = m.getCenter(); cb.current.onMove?.({ lat: c.lat, lng: c.lng, zoom: m.getZoom() }); }, 250);
    });

    const pick = (e: MapMouseEvent) => {
      const f = m.queryRenderedFeatures(e.point, { layers: ["points", "lines"] })[0];
      if (!f) { setPicked(null); cb.current.onSelect?.(null); return; }
      const p = f.properties as unknown as MapSite;
      setPicked(p);
      cb.current.onSelect?.(p);
    };
    m.on("click", (e) => {
      const cl = m.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
      if (cl) {
        const src = m.getSource("sites") as GeoJSONSource;
        void src.getClusterExpansionZoom(cl.properties.cluster_id).then((z) => m.easeTo({ center: (cl.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z + 0.5 }));
        return;
      }
      pick(e);
    });
    for (const l of ["points", "clusters", "lines"]) {
      m.on("mouseenter", l, () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", l, () => (m.getCanvas().style.cursor = ""));
    }
    return () => { m.remove(); map.current = null; ready.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- filters, query, selection
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    const f = filter as never;
    for (const l of ["points", "evidence-ring", "lines", "lines-casing"]) {
      const base = l === "points" ? ["!", ["has", "point_count"]] : l === "evidence-ring" ? ["all", ["!", ["has", "point_count"]], [">", ["get", "evidence_count"], 0]] : null;
      m.setFilter(l, (base ? ["all", base, f] : f) as never);
    }
    m.setLayoutProperty("lines", "visibility", showLines ? "visible" : "none");
    m.setLayoutProperty("lines-casing", "visibility", showLines ? "visible" : "none");
  }, [filter, showLines]);
  useEffect(() => { void load(); }, [q, load]);
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) m.setFilter("selected", ["==", ["get", "slug"], selectedSlug ?? picked?.slug ?? ""]);
  }, [selectedSlug, picked]);
  useEffect(() => {
    if (flyTo && map.current) map.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: flyTo.zoom ?? 14, essential: true });
  }, [flyTo]);

  // -- satellite / historical basemap
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      const style = m.getStyle();
      if (!style) return;
      for (const l of style.layers) {
        if (["fill", "background", "fill-extrusion", "hillshade"].includes(l.type) || (l.type === "line" && /water|boundary/.test(l.id) && year))
          m.setLayoutProperty(l.id, "visibility", satOn ? "none" : "visible");
        if (l.type === "line" && !["lines", "lines-casing"].includes(l.id))
          m.setPaintProperty(l.id, "line-opacity", satOn ? 0.22 : 1);
        if (l.type === "symbol" && l.id.startsWith("label")) m.setPaintProperty(l.id, "text-color", satOn ? "#ffffff" : "#333333");
      }
      if (m.getLayer("sat")) m.removeLayer("sat");
      if (m.getSource("sat")) m.removeSource("sat");
      if (satOn) {
        const live = year === 0;
        m.addSource("sat", { type: "raster", tiles: [live ? gibs() : eox(year!)], tileSize: 256, maxzoom: live ? 9 : 13,
          attribution: live ? "NASA GIBS · VIIRS daily true colour" : `Sentinel-2 cloudless ${year} © EOX IT Services GmbH (contains modified Copernicus Sentinel data ${year})` });
        const first = style.layers.find((l) => l.type !== "background")?.id;
        m.addLayer({ id: "sat", type: "raster", source: "sat" }, first);
      }
    };
    if (ready.current) apply();
    else m.once("load", apply);
  }, [year, satOn]);

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        const m = map.current;
        if (!m) return;
        userMarker.current?.remove();
        const dot = document.createElement("div");
        dot.className = "kd-user-dot";
        userMarker.current = new Marker({ element: dot }).setLngLat([p.coords.longitude, p.coords.latitude]).addTo(m);
        m.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 14.5, essential: true });
        onLocate?.({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className={cn("relative overflow-hidden bg-surface-muted", className)}>
      <div className="absolute inset-0"><div ref={el} className="size-full" role="application" aria-label={t("map.aria")} /></div>
      {loading && <div className="pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden"><div className="skeleton h-full w-full" /></div>}

      {controls && (
        <>
          <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
            <div className="flex overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
              <button onClick={() => onYearChange?.(null)} className={cn("flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold", !satOn ? "bg-navy text-white" : "text-ink-2 hover:bg-surface-muted")}><Layers className="size-4" />{t("map.map")}</button>
              <button onClick={() => onYearChange?.(year ?? 2024)} className={cn("flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold", satOn ? "bg-navy text-white" : "text-ink-2 hover:bg-surface-muted")}><Satellite className="size-4" />{t("map.satellite")}</button>
            </div>
            <button onClick={() => setLayerMenu(!layerMenu)} className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-semibold text-ink-2 shadow-sm hover:bg-surface-muted">{t("map.layers")}</button>
            {layerMenu && (
              <div className="w-56 rounded-xl border border-line bg-surface p-3 text-sm shadow-[var(--shadow-float)]">
                <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={showLines} onChange={(e) => setShowLines(e.target.checked)} className="accent-orange" />{t("map.routes")}</label>
              </div>
            )}
            <button onClick={locate} aria-label={t("map.nearMe")} className="grid size-10 place-items-center rounded-lg border border-line bg-surface text-navy shadow-sm hover:bg-surface-muted"><Locate className="size-5" /></button>
          </div>

          {satOn && (
            <div className="absolute inset-x-3 bottom-16 z-10 mx-auto max-w-xl rounded-xl border border-line bg-surface/95 p-3 shadow-[var(--shadow-float)] backdrop-blur sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[34rem] sm:-translate-x-1/2">
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="font-semibold text-ink">{t("map.timeSlider")}</span>
                <span className="font-bold text-orange-dark">{year === 0 ? t("map.today") : year}</span>
              </div>
              <input type="range" min={2016} max={2025} step={1} value={year === 0 ? 2025 : year ?? 2024} aria-label={t("map.timeSlider")}
                onChange={(e) => onYearChange?.(Number(e.target.value) === 2025 ? 0 : Number(e.target.value))} className="w-full accent-orange" />
              <div className="flex justify-between text-[11px] text-ink-3"><span>2016</span><span>2020</span><span>2024</span><span>{t("map.today")}</span></div>
              <p className="mt-1 text-[11px] text-ink-3">{year === 0 ? t("map.gibsNote") : t("map.eoxNote", { year: year ?? 2024 })}</p>
            </div>
          )}

          <div className="absolute bottom-3 left-3 z-10 hidden rounded-xl border border-line bg-surface/95 px-3 py-2 text-xs shadow-sm backdrop-blur sm:block">
            <p className="kicker mb-1">{t("map.legend")}</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
              {MAP_STATUS_LEGEND.map((s) => (
                <li key={s} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-white shadow-sm" style={{ background: STATUS_META[s].color }} />{t(`status.${s}` as MsgKey)}</li>
              ))}
              <li className="col-span-2 flex items-center gap-1.5"><span className="size-2.5 rounded-full border-2 border-green" />{t("map.hasEvidence")}</li>
            </ul>
          </div>
          {count !== null && (
            <div className="absolute left-3 top-3 z-10 rounded-full border border-line bg-surface/95 px-3 py-1 text-xs font-semibold text-ink-2 shadow-sm backdrop-blur">{t("map.inView", { n: count })}</div>
          )}
        </>
      )}

      {showCard && picked && (
        <div className="absolute inset-x-3 bottom-20 z-20 mx-auto max-w-sm animate-fade-up rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-float)] sm:bottom-auto sm:left-3 sm:right-auto sm:top-12 sm:mx-0">
          <button onClick={() => setPicked(null)} aria-label="Close" className="absolute right-2 top-2 rounded p-1 text-ink-3 hover:bg-surface-muted">✕</button>
          <CategoryChip category={picked.category} />
          <h3 className="mt-1 pr-6 text-[15px] font-bold leading-snug text-ink">{picked.title}</h3>
          <p className="text-xs text-ink-3">{[picked.locality, picked.city].filter(Boolean).join(", ")}</p>
          <div className="mt-2 flex items-center gap-2"><StatusBadge status={picked.status} /><span className="text-xs text-ink-3">{Number(picked.evidence_count) > 0 ? t("card.evidence", { n: picked.evidence_count }) : t("card.noEvidence")}</span></div>
          <Link href={`/projects/${picked.slug}`} className="mt-3 inline-flex text-sm font-bold text-orange-dark hover:underline">{t("card.view")} →</Link>
        </div>
      )}
    </div>
  );
}
