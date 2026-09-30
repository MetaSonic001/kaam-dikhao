"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { SiteCard, SiteCardSkeleton } from "../site-card";
import { Button, EmptyState, ErrorState, Modal, Select } from "../ui";
import { api, qs } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { fmtNum } from "@/lib/format";
import { CATEGORIES, MAP_STATUS_LEGEND, STATUS_META } from "@/lib/meta";
import { cn } from "@/lib/utils";
import type { City, SiteListItem } from "@/lib/types";
import type { MsgKey } from "@/lib/messages";

const PAGE = 18;

export function ProjectsBrowser({ cities }: { cities: City[] }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [items, setItems] = useState<SiteListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [q, setQ] = useState(sp.get("q") ?? "");

  const status = sp.getAll("status");
  const category = sp.getAll("category");
  const origin = sp.getAll("origin");
  const city = sp.get("city") ?? "";
  const sort = sp.get("sort") ?? "recent";
  const evidence = sp.get("has_evidence") === "true";
  const page = Number(sp.get("page") ?? 0);

  const set = (patch: Record<string, string | string[] | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      p.delete(k);
      if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
      else if (v) p.set(k, v);
    }
    if (!("page" in patch)) p.delete("page");
    router.replace(`${path}?${p.toString()}`, { scroll: false });
  };

  const key = sp.toString();
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    setItems(null); setErr(false);
    const params = new URLSearchParams(key);
    api<{ items: SiteListItem[]; total: number }>(`/api/sites${qs({ q: params.get("q"), city: params.get("city"), status: params.getAll("status"), category: params.getAll("category"), origin: params.getAll("origin"), has_evidence: params.get("has_evidence") === "true" || undefined, sort: params.get("sort") ?? "recent", limit: PAGE, offset: Number(params.get("page") ?? 0) * PAGE })}`)
      .then((r) => { if (alive) { setItems(r.items); setTotal(r.total); } })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, [key, nonce]);
  useEffect(() => { const h = setTimeout(() => { if ((sp.get("q") ?? "") !== q) set({ q: q || null }); }, 350); return () => clearTimeout(h); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const tog = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const active = status.length + category.length + origin.length + (city ? 1 : 0) + (evidence ? 1 : 0) + (sp.get("q") ? 1 : 0);
  const chip = (on: boolean) => cn("rounded-full border px-2.5 py-1 text-[13px] font-semibold transition", on ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink-2 hover:bg-surface-muted");

  const filters = (
    <div className="space-y-6">
      <div>
        <p className="kicker mb-2">{t("filter.city")}</p>
        <Select value={city} onChange={(e) => set({ city: e.target.value || null })} aria-label={t("filter.city")}>
          <option value="">{t("filter.allCities")}</option>
          {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.sites})</option>)}
        </Select>
      </div>
      <div>
        <p className="kicker mb-2">{t("filter.status")}</p>
        <div className="flex flex-wrap gap-1.5">
          {MAP_STATUS_LEGEND.concat(["DISPUTED"]).map((s) => (
            <button key={s} aria-pressed={status.includes(s)} onClick={() => set({ status: tog(status, s) })} className={chip(status.includes(s))}>
              <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: STATUS_META[s].color }} />{t(`status.${s}` as MsgKey)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="kicker mb-2">{t("filter.type")}</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => <button key={c} aria-pressed={category.includes(c)} onClick={() => set({ category: tog(category, c) })} className={chip(category.includes(c))}>{t(`cat.${c}` as MsgKey)}</button>)}
        </div>
      </div>
      <div>
        <p className="kicker mb-2">{t("filter.source")}</p>
        <div className="flex flex-wrap gap-1.5">
          {(["osm", "official", "citizen"] as const).map((o) => <button key={o} aria-pressed={origin.includes(o)} onClick={() => set({ origin: tog(origin, o) })} className={chip(origin.includes(o))}>{t(`origin.${o}` as MsgKey)}</button>)}
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" className="accent-orange" checked={evidence} onChange={(e) => set({ has_evidence: e.target.checked ? "true" : null })} />{t("filter.evidence")}</label>
      {active > 0 && <button onClick={() => router.replace(path)} className="text-sm font-bold text-orange-dark">{t("common.clearFilters")}</button>}
    </div>
  );

  return (
    <div className="wrap py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{t("projects.title")}</h1>
      <p className="mt-1 text-ink-2">{t("projects.sub")}</p>

      <div className="mt-5 flex gap-2">
        <label className="card flex flex-1 items-center gap-2 px-3">
          <Search className="size-5 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("projects.search")} aria-label={t("projects.search")} className="h-12 w-full bg-transparent outline-none placeholder:text-ink-3" />
          {q && <button onClick={() => setQ("")} aria-label="Clear"><X className="size-4 text-ink-3" /></button>}
        </label>
        <Button variant="outline" size="lg" className="lg:hidden" onClick={() => setSheet(true)}><Filter className="size-4" />{active > 0 && active}</Button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block"><div className="card sticky top-20 p-5">{filters}</div></aside>
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-2" aria-live="polite">{items ? t("projects.found", { n: fmtNum(total, lang) }) : t("common.loading")}</p>
            <Select className="!w-auto" value={sort} onChange={(e) => set({ sort: e.target.value })} aria-label={t("projects.sort")}>
              <option value="recent">{t("sort.recent")}</option><option value="delayed">{t("sort.delayed")}</option><option value="evidence">{t("sort.evidence")}</option><option value="title">{t("sort.title")}</option>
            </Select>
          </div>
          {err ? <ErrorState title={t("error.projects")} text={t("error.tryLater")} onRetry={() => setNonce((n) => n + 1)} retryLabel={t("common.retry")} /> :
            items === null ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <SiteCardSkeleton key={i} />)}</div> :
            items.length === 0 ? <EmptyState title={t("empty.projects")} text={t("empty.projectsSub")} action={<Button variant="outline" onClick={() => router.replace(path)}>{t("common.clearFilters")}</Button>} /> :
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((s) => <SiteCard key={s.id} site={s} />)}</div>}
          {items && total > PAGE && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="outline" disabled={page === 0} onClick={() => { set({ page: page > 1 ? String(page - 1) : null }); window.scrollTo({ top: 0 }); }}>{t("common.prev")}</Button>
              <span className="text-sm text-ink-2">{page + 1} / {Math.ceil(total / PAGE)}</span>
              <Button variant="outline" disabled={(page + 1) * PAGE >= total} onClick={() => { set({ page: String(page + 1) }); window.scrollTo({ top: 0 }); }}>{t("common.next")}</Button>
            </div>
          )}
        </section>
      </div>
      <Modal open={sheet} onClose={() => setSheet(false)} title={t("filter.title")}>{filters}<Button className="mt-6 w-full" onClick={() => setSheet(false)}>{t("filter.show", { n: total })}</Button></Modal>
    </div>
  );
}
