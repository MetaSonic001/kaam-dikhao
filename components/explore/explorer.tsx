"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { List, Map as MapIcon, Search, SlidersHorizontal, X } from "lucide-react";
import { KdMap, type MapSite } from "../map/kd-map";
import { SiteCard, SiteCardSkeleton } from "../site-card";
import { EmptyState, Select } from "../ui";
import { api, qs } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { CATEGORIES, MAP_STATUS_LEGEND, STATUS_META } from "@/lib/meta";
import { cn } from "@/lib/utils";
import type { Category, City, SiteListItem, SiteStatus } from "@/lib/types";
import type { MsgKey } from "@/lib/messages";

const FALLBACK: [number, number] = [19.076, 72.8777];

function radiusKm(zoom: number, lat: number) {
  return Math.min(60, Math.max(0.8, (156.543 * Math.cos((lat * Math.PI) / 180) * 500) / 2 ** zoom * 1.2));
}

export function Explorer({ cities }: { cities: City[] }) {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const [view, setView] = useState<"map" | "list">("map");
  const [panel, setPanel] = useState(true);
  const [statuses, setStatuses] = useState<SiteStatus[]>((sp.getAll("status") as SiteStatus[]) ?? []);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [year, setYear] = useState<number | null>(sp.get("year") ? Number(sp.get("year")) : null);
  const city = cities.find((c) => c.slug === sp.get("city")) ?? cities.find((c) => c.sites > 0) ?? cities[0];
  const start: [number, number] = sp.get("lat") ? [Number(sp.get("lat")), Number(sp.get("lng"))] : (city?.center ?? FALLBACK);
  const startZoom = sp.get("z") ? Number(sp.get("z")) : (city?.zoom ?? 11);
  const [cursor, setCursor] = useState({ lat: start[0], lng: start[1], zoom: startZoom });
  const [list, setList] = useState<SiteListItem[] | null>(null);
  const [selected, setSelected] = useState<MapSite | null>(null);
  const [fly, setFly] = useState<{ lat: number; lng: number; zoom?: number; nonce: number } | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  // arriving with ?near=1 asks the browser for the user's position
  useEffect(() => {
    if (sp.get("near") === "1") navigator.geolocation?.getCurrentPosition((p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); setFly({ lat: p.coords.latitude, lng: p.coords.longitude, zoom: 14, nonce: Date.now() }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchList = useCallback(async () => {
    const c = me ?? cursor;
    try {
      const r = await api<{ items: SiteListItem[] }>(`/api/sites${qs({ lat: c.lat, lng: c.lng, radius_km: me ? 3 : radiusKm(cursor.zoom, cursor.lat), status: statuses, category: cats, q, limit: 40, sort: "nearest" })}`);
      setList(r.items);
    } catch { setList([]); }
  }, [cursor, me, statuses, cats, q]);
  useEffect(() => { const h = setTimeout(fetchList, 300); return () => clearTimeout(h); }, [fetchList]);

  useEffect(() => {
    const p = new URLSearchParams();
    p.set("lat", cursor.lat.toFixed(4)); p.set("lng", cursor.lng.toFixed(4)); p.set("z", cursor.zoom.toFixed(1));
    if (year !== null) p.set("year", String(year));
    router.replace(`/explore?${p.toString()}`, { scroll: false });
  }, [cursor, year, router]);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const pill = (on: boolean) => cn("rounded-full border px-2.5 py-1 text-xs font-semibold transition", on ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink-2 hover:bg-surface-muted");
  const filterCount = statuses.length + cats.length + (q ? 1 : 0);

  const panelBody = useMemo(() => (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-line p-3">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3">
          <Search className="size-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("explore.search")} aria-label={t("explore.search")} className="h-10 w-full bg-transparent text-sm outline-none" />
          {q && <button onClick={() => setQ("")} aria-label="Clear"><X className="size-4 text-ink-3" /></button>}
        </label>
        <div className="flex gap-2">
          <Select aria-label={t("explore.city")} value={city?.slug} onChange={(e) => { const c = cities.find((x) => x.slug === e.target.value)!; setFly({ lat: c.center[0], lng: c.center[1], zoom: c.zoom, nonce: Date.now() }); }}>
            {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MAP_STATUS_LEGEND.map((s) => (
            <button key={s} onClick={() => setStatuses(toggle(statuses, s))} className={pill(statuses.includes(s))} aria-pressed={statuses.includes(s)}>
              <span className="mr-1 inline-block size-2 rounded-full" style={{ background: STATUS_META[s].color }} />{t(`status.${s}` as MsgKey)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.slice(0, 7).map((c) => <button key={c} onClick={() => setCats(toggle(cats, c))} className={pill(cats.includes(c))} aria-pressed={cats.includes(c)}>{t(`cat.${c}` as MsgKey)}</button>)}
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <p className="kicker">{me ? t("explore.nearYou") : t("explore.inView")}{list ? ` · ${list.length}` : ""}</p>
        {list === null && [1, 2, 3].map((i) => <SiteCardSkeleton key={i} />)}
        {list && list.length === 0 && <EmptyState title={t("empty.projects")} text={t("empty.projectsSub")} action={filterCount ? <button className="text-sm font-bold text-orange-dark" onClick={() => { setStatuses([]); setCats([]); setQ(""); }}>{t("common.clearFilters")}</button> : undefined} />}
        {list?.map((s) => <SiteCard key={s.id} site={s} compact className={selected?.slug === s.slug ? "ring-2 ring-orange" : ""} />)}
      </div>
    </div>
  ), [q, city, cities, statuses, cats, list, me, selected, t, filterCount]);

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] overflow-hidden">
      <aside className={cn("z-20 hidden w-[380px] shrink-0 border-r border-line bg-background md:block", !panel && "md:hidden")}>{panelBody}</aside>
      <div className="relative flex-1">
        <KdMap className="absolute inset-0" center={start} zoom={startZoom} statuses={statuses} categories={cats} q={q} year={year} onYearChange={setYear}
          onMove={setCursor} onSelect={setSelected} onLocate={(c) => { setMe(c); }} flyTo={fly} selectedSlug={selected?.slug} />
        <button onClick={() => setPanel(!panel)} className="absolute left-3 top-14 z-10 hidden items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-semibold shadow-sm md:inline-flex">
          <SlidersHorizontal className="size-4" />{panel ? t("explore.hidePanel") : t("explore.showPanel")}{filterCount > 0 && <span className="rounded-full bg-orange px-1.5 text-[11px] text-white">{filterCount}</span>}
        </button>
      </div>
      {/* mobile: full-screen list alternative (maps must always have a list, WCAG) */}
      {view === "list" && <div className="absolute inset-0 z-30 bg-background pb-20 md:hidden">{panelBody}</div>}
      <div className="absolute bottom-20 left-1/2 z-40 -translate-x-1/2 md:hidden">
        <div className="flex overflow-hidden rounded-full border border-line bg-surface shadow-[var(--shadow-float)]">
          <button onClick={() => setView("map")} className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold", view === "map" ? "bg-navy text-white" : "text-ink-2")}><MapIcon className="size-4" />{t("map.map")}</button>
          <button onClick={() => setView("list")} className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold", view === "list" ? "bg-navy text-white" : "text-ink-2")}><List className="size-4" />{t("explore.list")}</button>
        </div>
      </div>
    </div>
  );
}
