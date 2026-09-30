"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Satellite as SatIcon } from "lucide-react";
import { CompareSlider } from "./compare-slider";
import { AiBadge } from "../badges";
import { Badge, Button, Skeleton, useToast } from "../ui";
import { api, mediaUrl } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Satellite } from "@/lib/types";
import type { MsgKey } from "@/lib/messages";

export function SatelliteViewer({ siteId, initial }: { siteId: string; initial: Satellite }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [sat, setSat] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [pick, setPick] = useState<{ a: number; b: number } | null>(null);
  const started = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  const refresh = async (force = false) => {
    setBusy(true);
    try { setSat(await api<Satellite>(`/api/sites/${siteId}/satellite/refresh${force ? "?force=true" : ""}`, { method: "POST" })); setPick(null); }
    catch (e) { toast((e as Error).message, "error"); }
    finally { setBusy(false); }
  };

  // first view with no imagery yet: fetch it automatically (once) when scrolled into view
  useEffect(() => {
    if (sat.frames.length || started.current || !root.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started.current) { started.current = true; void refresh(); } }, { rootMargin: "200px" });
    io.observe(root.current);
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const frames = sat.frames;
  const ch = sat.change?.metrics;
  const aIdx = pick?.a ?? Math.max(0, frames.findIndex((f) => ch && f.scene_id === sat.change?.scene_id));
  const bIdx = pick?.b ?? (ch ? Math.max(0, frames.findIndex((f) => f.acquired_at.slice(0, 10) === ch.before_date)) : 0);
  const after = frames[aIdx] ?? frames[frames.length - 1];
  const before = frames[bIdx] ?? frames[0];
  const showOverlay = overlay && !!sat.change && !pick;

  return (
    <div ref={root}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2"><AiBadge label={t("sat.candidate")} /><Badge tone="gray">{t("sat.res")}</Badge></div>
        <Button variant="outline" size="sm" loading={busy} onClick={() => refresh(true)}><RefreshCw className="size-3.5" />{t("sat.refresh")}</Button>
      </div>

      {busy && frames.length === 0 ? (
        <div>
          <Skeleton className="aspect-[4/3] w-full" />
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-2"><SatIcon className="size-4 animate-pulse text-orange" />{t("sat.fetching")}</p>
        </div>
      ) : frames.length < 2 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-6 text-center text-sm text-ink-2">{t("sat.none")}</div>
      ) : (
        <>
          <CompareSlider before={mediaUrl(showOverlay ? before.image_url : before.image_url)} after={mediaUrl(showOverlay ? sat.change!.image_url : after.image_url)}
            beforeLabel={fmtDate(before.acquired_at, lang)} afterLabel={showOverlay ? t("sat.overlay") : fmtDate(after.acquired_at, lang)} alt={t("sat.alt")} />
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-3">
            <label className={cn("flex items-center gap-1.5 font-semibold", sat.change ? "cursor-pointer text-ink-2" : "opacity-50")}><input type="checkbox" className="accent-orange" disabled={!sat.change} checked={overlay} onChange={(e) => setOverlay(e.target.checked)} />{t("sat.showOverlay")}</label>
            <span>{t("sat.source")}: {sat.source}</span>
          </div>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1" aria-label={t("sat.frames")}>
            {frames.map((f, i) => (
              <button key={f.scene_id} onClick={() => setPick({ a: i === bIdx ? aIdx : i, b: i === bIdx ? i : bIdx })} className={cn("relative shrink-0 overflow-hidden rounded-lg border-2", i === aIdx ? "border-orange" : i === bIdx ? "border-navy" : "border-transparent")}>
                <img src={mediaUrl(f.image_url)} alt={fmtDate(f.acquired_at, lang)} className="size-20 object-cover" loading="lazy" />
                <span className="absolute inset-x-0 bottom-0 bg-navy/80 py-0.5 text-center text-[10px] font-semibold text-white">{fmtDate(f.acquired_at, lang, false)}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-3">{t("sat.pickHint")}</p>
        </>
      )}

      {sat.change && ch && (
        <div className="mt-4 rounded-xl border border-line bg-surface-muted/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink">{t("sat.changeTitle", { a: fmtDate(ch.before_date, lang), b: fmtDate(ch.after_date, lang) })}</p>
            <Badge tone={ch.level === "high" ? "amber" : ch.level === "moderate" ? "blue" : "gray"}>{t(`sat.level.${ch.level}` as MsgKey)}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-ink-2">{t("sat.changeBody", { pct: Math.round(ch.changed_pixel_share * 100), m: ch.window_m })}</p>
          <p className="mt-2 text-xs text-ink-3">NDVI {ch.mean_ndvi_before} → {ch.mean_ndvi_after}</p>
          <p className="mt-3 rounded-lg bg-amber-soft p-2.5 text-xs font-medium text-amber">{sat.label} {t("sat.notProof")}</p>
        </div>
      )}
    </div>
  );
}
