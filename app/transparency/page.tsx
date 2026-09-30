import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert, ExternalLink } from "lucide-react";
import { SectionTitle } from "@/components/ui";
import { apiSafe } from "@/lib/api";
import { fmtNum, timeAgo } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import type { Stats } from "@/lib/types";

export const metadata: Metadata = { title: "Transparency & data sources", description: "Where every number comes from, how fresh it is, and what Kaam Dikhao itself has verified." };
export const dynamic = "force-dynamic";

type Src = { key: string; name: string; coverage: string; update: string; license: string; method: string; url: string; runs: { scope: string; finished_at: string | null; ok: boolean | null; items: number; detail: string | null }[]; extra?: { observations: number; last: string | null } };

export default async function Transparency() {
  const { t, lang } = await getT();
  const [stats, src] = await Promise.all([apiSafe<Stats>("/api/stats"), apiSafe<{ sources: Src[] }>("/api/sync-status")]);
  const tiles: [string, number | undefined][] = [
    [t("tr.works"), stats?.sites], [t("tr.verified"), stats?.reports.verified], [t("tr.review"), stats?.reports.pending], [t("tr.disputed"), stats?.reports.disputed],
    [t("tr.rejected"), stats?.reports.rejected], [t("tr.rtis"), stats?.rtis], [t("tr.coverage"), stats?.evidence_coverage_pct],
  ];
  return (
    <div className="wrap py-8">
      <SectionTitle kicker={t("nav.transparency")} title={t("tr.title")} sub={t("tr.sub")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map(([l, v], i) => <div key={l} className="card p-4"><p className="text-2xl font-extrabold text-navy">{fmtNum(v ?? 0, lang)}{i === 6 ? "%" : ""}</p><p className="text-[13px] text-ink-2">{l}</p></div>)}
      </div>

      <h2 className="mb-3 mt-12 text-xl font-bold text-ink">{t("tr.sources")}</h2>
      <div className="space-y-3">
        {src?.sources.map((s) => {
          const last = s.runs.filter((r) => r.finished_at).sort((a, b) => (b.finished_at ?? "").localeCompare(a.finished_at ?? ""))[0];
          return (
            <article key={s.key} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="text-base font-bold text-ink">{s.name}</h3><p className="text-[13px] text-ink-2">{s.coverage}</p></div>
                {s.runs.length > 0 && (last ? <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${last.ok ? "text-green" : "text-red"}`}>{last.ok ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}{t("live.synced", { when: timeAgo(last.finished_at, lang) })}</span> : null)}
                {s.extra && s.extra.last && <span className="text-xs font-bold text-green">{s.extra.observations} · {timeAgo(s.extra.last, lang)}</span>}
              </div>
              <dl className="mt-3 grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-3">
                <div><dt className="kicker">{t("tr.update")}</dt><dd className="text-ink">{s.update}</dd></div>
                <div><dt className="kicker">{t("tr.license")}</dt><dd className="text-ink">{s.license}</dd></div>
                <div><dt className="kicker">{t("tr.method")}</dt><dd className="text-ink-2">{s.method}</dd></div>
              </dl>
              {s.runs.length > 1 && <p className="mt-3 text-xs text-ink-3">{s.runs.map((r) => `${r.scope}: ${r.items}`).join(" · ")}</p>}
              <a href={s.url} target={s.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-blue hover:underline">{t("tr.open")}<ExternalLink className="size-3" /></a>
            </article>
          );
        })}
      </div>
      <div className="card mt-10 p-5 text-sm text-ink-2"><h3 className="font-bold text-ink">{t("tr.accountable")}</h3><p className="mt-1">{t("tr.accountableBody")} <Link href="/legal#grievance" className="font-semibold text-blue hover:underline">{t("footer.grievance")}</Link></p></div>
    </div>
  );
}
