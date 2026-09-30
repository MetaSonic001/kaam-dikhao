"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { EmptyState, ErrorState, Select, Skeleton, Tabs } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { fmtInr, fmtNum } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { CITY_LIST } from "@/lib/meta";

type Row = { name: string; slug: string; city: string; projects: number; completed: number; ongoing: number; delayed: number; delayed_pct: number; under_review: number; sanctioned: number; with_evidence: number; evidence_coverage_pct: number; verified_reports: number };
type Data = { kind: string; rows: Row[]; note: string | null; method: string };
type Kind = "wards" | "localities" | "agencies" | "contractors" | "cities";

export default function ReportCards() {
  const { t, lang } = useI18n();
  const [kind, setKind] = useState<Kind>("wards");
  const [city, setCity] = useState("mumbai");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setData(null); setErr(false);
    api<Data>(`/api/report-cards${qs({ kind, city: kind === "cities" ? undefined : city })}`).then(setData).catch(() => setErr(true));
  }, [kind, city]);

  const link = (r: Row) => (kind === "cities" ? `/projects?city=${r.name.toLowerCase()}` : kind === "contractors" || kind === "agencies" ? `/projects?q=${encodeURIComponent(r.name)}` : `/projects?city=${city}&q=${encodeURIComponent(r.name)}`);

  return (
    <div className="wrap py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{t("rc.title")}</h1>
      <p className="mt-1 max-w-2xl text-ink-2">{t("rc.sub")}</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs<Kind> value={kind} onChange={setKind} tabs={(["wards", "localities", "agencies", "contractors", "cities"] as Kind[]).map((k) => ({ id: k, label: t(`rc.${k}` as never) }))} />
        {kind !== "cities" && <Select className="!w-44" value={city} onChange={(e) => setCity(e.target.value)} aria-label={t("filter.city")}>{CITY_LIST.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}</Select>}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-soft p-3.5 text-[13px] text-blue"><Info className="mt-0.5 size-4 shrink-0" />{data?.note ?? t("rc.noRank")}</div>

      <div className="mt-5">
        {err ? <ErrorState title={t("error.generic")} text={t("error.tryLater")} onRetry={() => setKind(kind)} /> :
          !data ? <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div> :
          data.rows.length === 0 ? <EmptyState title={t("rc.empty")} text={kind === "contractors" ? t("rc.emptyContractors") : t("rc.emptySub")} /> : (
            <>
              {/* desktop table */}
              <div className="card hidden overflow-hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-3">
                    <tr><th className="px-4 py-3">{t("rc.name")}</th><th className="px-3">{t("rc.projects")}</th><th className="px-3">{t("rc.completed")}</th><th className="px-3">{t("rc.ongoing")}</th><th className="px-3">{t("rc.delayed")}</th><th className="px-3">{t("rc.coverage")}</th><th className="px-4 text-right">{t("card.sanctioned")}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.rows.map((r) => (
                      <tr key={r.name} className="hover:bg-surface-muted/50">
                        <td className="px-4 py-3"><Link href={link(r)} className="font-bold text-ink hover:text-orange-dark">{r.name}</Link>{kind !== "cities" && <p className="text-xs text-ink-3">{r.city}</p>}</td>
                        <td className="px-3 font-semibold">{fmtNum(r.projects, lang)}</td><td className="px-3">{fmtNum(r.completed, lang)}</td><td className="px-3">{fmtNum(r.ongoing, lang)}</td>
                        <td className="px-3">{fmtNum(r.delayed, lang)} <span className="text-xs text-ink-3">({r.delayed_pct}%)</span></td>
                        <td className="px-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-green" style={{ width: `${r.evidence_coverage_pct}%` }} /></div><span className="text-xs text-ink-2">{r.evidence_coverage_pct}%</span></div></td>
                        <td className="px-4 text-right">{r.sanctioned ? fmtInr(r.sanctioned, lang) : <span className="text-ink-3">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* mobile cards */}
              <div className="space-y-3 md:hidden">
                {data.rows.map((r) => (
                  <Link key={r.name} href={link(r)} className="card block p-4">
                    <p className="font-bold text-ink">{r.name}</p>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs"><Kv k={t("rc.projects")} v={r.projects} /><Kv k={t("rc.completed")} v={r.completed} /><Kv k={t("rc.ongoing")} v={r.ongoing} /><Kv k={t("rc.delayed")} v={r.delayed} /></div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-ink-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted"><div className="h-full bg-green" style={{ width: `${r.evidence_coverage_pct}%` }} /></div>{t("rc.coverage")} {r.evidence_coverage_pct}%</div>
                  </Link>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-ink-3">{data.method} <Link href="/methodology" className="font-semibold text-blue hover:underline">{t("nav.methodology")}</Link></p>
            </>
          )}
      </div>
    </div>
  );
}
function Kv({ k, v }: { k: string; v: number }) { return <div><p className="text-lg font-extrabold text-navy">{v}</p><p className="text-ink-3">{k}</p></div>; }
