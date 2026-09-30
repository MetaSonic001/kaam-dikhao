import Link from "next/link";
import { ArrowRight, Banknote, Camera, FileSearch, Landmark, Mic, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { HeroSearch } from "@/components/home/hero-search";
import { LiveMapCard } from "@/components/home/live-map-card";
import { SiteCard } from "@/components/site-card";
import { Button, EmptyState, SectionTitle } from "@/components/ui";
import { apiSafe, mediaUrl } from "@/lib/api";
import { fmtNum, timeAgo } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import type { City, RecentReport, SiteListItem, Stats } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { t, lang } = await getT();
  const [stats, cities, delayed, recent, watch] = await Promise.all([
    apiSafe<Stats>("/api/stats"),
    apiSafe<City[]>("/api/cities"),
    apiSafe<{ items: SiteListItem[] }>("/api/sites?sort=delayed&limit=6"),
    apiSafe<RecentReport[]>("/api/reports/recent?limit=6"),
    apiSafe<{ items: { key: string; title: string; detail: string; count: number }[] }>("/api/civic-watch"),
  ]);
  const live = cities?.filter((c) => c.sites > 0) ?? [];
  const home = live[0] ?? cities?.[0];

  const tiles = [
    { v: fmtNum(stats?.sites ?? 0, lang), l: t("stat.works"), sub: t("stat.worksSub") },
    { v: fmtNum(stats?.by_status?.DELAYED ?? 0, lang), l: t("stat.delayed"), sub: t("stat.delayedSub") },
    { v: fmtNum(stats?.reports.verified ?? 0, lang), l: t("stat.verified"), sub: t("stat.verifiedSub") },
    { v: fmtNum(live.length, lang), l: t("stat.cities"), sub: t("stat.citiesSub") },
    { v: fmtNum(stats?.rtis ?? 0, lang), l: t("stat.rtis"), sub: t("stat.rtisSub") },
  ];

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-orange/20 blur-3xl" aria-hidden />
        <div className="wrap relative grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              <span className="size-2 animate-pulse-ring rounded-full bg-green" />
              {t("hero.pill", { n: fmtNum(stats?.sites ?? 0, lang) })}
            </p>
            <h1 className="text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              {t("hero.title1")} <span className="text-orange">{t("hero.title2")}</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/75">{t("hero.sub")}</p>
            <div className="mt-7"><HeroSearch /></div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/explore" size="lg">{t("hero.cta1")} <ArrowRight className="size-4" /></Button>
              <Button href="/report" variant="outline" size="lg" className="!border-white/30 !bg-transparent !text-white hover:!bg-white/10"><Camera className="size-4" />{t("hero.cta2")}</Button>
            </div>
          </div>
          {home && <LiveMapCard center={home.center} zoom={home.zoom} />}
        </div>
      </section>

      {/* ------------------------------------------------------ live stats */}
      <section className="wrap -mt-6 relative z-10">
        <div className="card grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          {tiles.map((s) => (
            <div key={s.l} className="border-b border-line p-4 last:border-b-0 sm:p-5 lg:border-b-0">
              <p className="text-[1.7rem] font-extrabold tracking-tight text-navy">{s.v}</p>
              <p className="text-sm font-semibold text-ink">{s.l}</p>
              <p className="text-xs text-ink-3">{s.sub}</p>
            </div>
          ))}
        </div>
        {stats?.last_synced_at && (
          <p className="mt-2 flex items-center justify-end gap-1.5 text-xs text-ink-3">
            <span className="size-1.5 animate-pulse-ring rounded-full bg-green" />
            {t("live.synced", { when: timeAgo(stats.last_synced_at, lang) })} ·{" "}
            <Link href="/transparency" className="font-semibold text-blue hover:underline">{t("live.sources")}</Link>
          </p>
        )}
      </section>

      {/* ------------------------------------------- the accountability loop */}
      <section className="wrap mt-16">
        <SectionTitle kicker={t("loop.kicker")} title={t("loop.title")} sub={t("loop.sub")} />
        <ol className="grid gap-3 md:grid-cols-5">
          {[
            { i: Banknote, k: "loop.1" }, { i: Landmark, k: "loop.2" }, { i: Camera, k: "loop.3" }, { i: ScanSearch, k: "loop.4" }, { i: FileSearch, k: "loop.5" },
          ].map((s, n) => (
            <li key={s.k} className="card relative p-4">
              <span className="absolute right-3 top-3 text-3xl font-black text-surface-muted">{n + 1}</span>
              <span className="grid size-10 place-items-center rounded-lg bg-orange-soft text-orange-dark"><s.i className="size-5" /></span>
              <h3 className="mt-3 font-bold text-ink">{t(`${s.k}.t` as never)}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{t(`${s.k}.d` as never)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------ delayed now */}
      <section className="wrap mt-16">
        <SectionTitle kicker={t("home.delayedKicker")} title={t("home.delayedTitle")} sub={t("home.delayedSub")}
          action={<Button href="/projects?status=DELAYED" variant="outline" size="sm">{t("common.viewAll")} <ArrowRight className="size-4" /></Button>} />
        {delayed && delayed.items.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{delayed.items.map((s) => <SiteCard key={s.id} site={s} />)}</div>
        ) : (
          <EmptyState title={t("empty.projects")} text={t("empty.projectsSub")} />
        )}
      </section>

      {/* --------------------------------------------------- civic watch */}
      {watch && watch.items.length > 0 && (
        <section className="wrap mt-16">
          <SectionTitle kicker={t("nav.civicWatch")} title={t("home.watchTitle")} sub={t("home.watchSub")} action={<Button href="/civic-watch" variant="outline" size="sm">{t("common.viewAll")} <ArrowRight className="size-4" /></Button>} />
          <div className="grid gap-3 md:grid-cols-3">
            {watch.items.slice(0, 3).map((w) => (
              <Link key={w.key} href="/civic-watch" className="card p-5 transition hover:shadow-[var(--shadow-float)]">
                <p className="text-3xl font-extrabold text-navy">{fmtNum(w.count, lang)}</p>
                <p className="mt-1 text-[15px] font-semibold text-ink">{t(`cw.k.${w.key}` as never)}</p>
                <p className="mt-1 text-[13px] text-ink-2">{t(`cw.d.${w.key}` as never)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------- report banner */}
      <section className="wrap mt-16">
        <div className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white sm:p-10">
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="kicker !text-orange">{t("report.kicker")}</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("report.title")}</h2>
              <p className="mt-3 max-w-lg text-white/75">{t("report.sub")}</p>
              <div className="mt-5 flex flex-wrap gap-3"><Button href="/report" size="lg"><Camera className="size-4" />{t("nav.report")}</Button></div>
            </div>
            <ul className="space-y-3 text-sm">
              {[[Camera, "report.f1"], [Mic, "report.f2"], [Sparkles, "report.f3"], [ShieldCheck, "report.f4"]].map(([I, k]) => {
                const Icon = I as typeof Camera;
                return <li key={k as string} className="flex items-start gap-3 rounded-xl bg-white/5 p-3"><Icon className="mt-0.5 size-5 shrink-0 text-orange" /><span className="text-white/85">{t(k as never)}</span></li>;
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* --------------------------------------------- recent evidence */}
      <section className="wrap mt-16">
        <SectionTitle kicker={t("home.evKicker")} title={t("home.evTitle")} sub={t("home.evSub")} />
        {recent && recent.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {recent.map((r) => (
              <Link key={r.id} href={`/projects/${r.site_slug}`} className="card group overflow-hidden">
                {r.thumb_url && <img src={mediaUrl(r.thumb_url)} alt={r.note_public ?? r.site_title} loading="lazy" className="aspect-[4/3] w-full object-cover transition group-hover:scale-105" />}
                <div className="p-2.5"><p className="line-clamp-2 text-[13px] font-semibold text-ink">{r.site_title}</p><p className="text-xs text-ink-3">{timeAgo(r.captured_at ?? r.created_at, lang)}</p></div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Camera className="size-6" />} title={t("home.evEmpty")} text={t("home.evEmptySub")} action={<Button href="/report">{t("nav.report")}</Button>} />
        )}
      </section>

      {/* ---------------------------------------------------- cities */}
      <section className="wrap mt-16">
        <SectionTitle kicker={t("home.citiesKicker")} title={t("home.citiesTitle")} />
        <div className="flex flex-wrap gap-2">
          {(cities ?? []).map((c) => (
            <Link key={c.slug} href={`/projects?city=${c.slug}`} className="card flex items-center gap-3 px-4 py-2.5 transition hover:shadow-[var(--shadow-float)]">
              <span className="font-bold text-ink">{c.name}</span>
              <span className="text-xs text-ink-3">{c.sites > 0 ? t("home.cityWorks", { n: c.sites }) : t("home.citySyncing")}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
