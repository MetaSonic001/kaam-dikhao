"use client";

import { ArrowDown, ArrowRight, Camera, ExternalLink, Landmark, Satellite } from "lucide-react";
import { OriginBadge } from "../badges";
import { mediaUrl } from "@/lib/api";
import { fmtDate, fmtInr, timeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { SiteDetail } from "@/lib/types";
import type { MsgKey } from "@/lib/messages";

/** The signature pattern: what the record says on one side, what the ground shows on the other. */
export function ClaimVsReality({ d }: { d: SiteDetail }) {
  const { t, lang } = useI18n();
  const s = d.site;
  const verified = d.reports.filter((r) => r.status === "VERIFIED");
  const latest = d.reports[0];
  const ch = d.satellite.change?.metrics;
  const issues = verified.filter((r) => r.observation === "issue" || r.observation === "not_started").length;
  const ts = d.timeline_state;

  const prog = (s.tags?.programme ?? null) as { name?: string; amount_inr?: number; source_url?: string } | null;
  const NP = <span className="font-normal text-ink-3">{t("card.notPublished")}</span>;
  const rows: [string, React.ReactNode][] = [
    [t("card.sanctioned"), s.sanctioned_amount ? fmtInr(s.sanctioned_amount, lang) : NP],
    [t("card.agency"), s.agency ?? NP],
    [t("cvr.contractor"), s.contractor ?? NP],
    [t("cvr.workOrder"), s.work_order_date ? fmtDate(s.work_order_date, lang) : NP],
    [t("card.expected"), s.expected_completion ? fmtDate(s.expected_completion, lang) : NP],
  ];

  let verdictKey: MsgKey = "cvr.v.none";
  if (verified.length && issues) verdictKey = "cvr.v.issues";
  else if (verified.length) verdictKey = "cvr.v.evidence";
  else if (d.pending_reports) verdictKey = "cvr.v.pending";
  else if (s.status === "DELAYED") verdictKey = "cvr.v.late";

  return (
    <div>
      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-bold text-navy"><Landmark className="size-4 text-orange" />{t("cvr.claim")}</p>
            <OriginBadge origin={s.origin} />
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ink">{s.claim_text ?? t("cvr.noClaim")}</p>
          {prog?.amount_inr && (
            <div className="mt-3 rounded-lg bg-green-soft p-3 text-[13px] text-ink">
              <p className="font-bold text-green">{t("cvr.programme")}</p>
              <p className="mt-0.5">{prog.name}</p>
              <p className="mt-1 font-semibold">{fmtInr(prog.amount_inr, lang)} <span className="font-normal text-ink-2">{t("cvr.programmeNote")}</span>
                {prog.source_url && <a href={prog.source_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 font-semibold text-blue hover:underline">{t("cvr.openSource")}<ExternalLink className="size-3" /></a>}</p>
            </div>
          )}
          <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-[13px]">
            {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-ink-3">{k}</dt><dd className="text-right font-semibold text-ink">{v}</dd></div>)}
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-xs text-ink-3">
            <span>{t("cvr.source")}: <b className="text-ink-2">{s.source_label ?? "—"}</b></span>
            {s.last_synced_at && <span>· {t("live.synced", { when: timeAgo(s.last_synced_at, lang) })}</span>}
            {s.source_url && <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue hover:underline">{t("cvr.openSource")}<ExternalLink className="size-3" /></a>}
          </div>
        </section>

        <div className="hidden items-center md:flex"><ArrowRight className="size-6 text-ink-3" /></div>
        <div className="flex justify-center md:hidden"><ArrowDown className="size-6 text-ink-3" /></div>

        <section className="card p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-navy"><Camera className="size-4 text-orange" />{t("cvr.reality")}</p>
          {d.reports.length ? (
            <>
              <div className="mt-3 flex gap-2">
                {d.reports.slice(0, 3).map((r) => (
                  <img key={r.id} src={mediaUrl(r.thumb_url ?? r.media_url)} alt="" className="aspect-square w-1/3 rounded-lg object-cover" loading="lazy" />
                ))}
              </div>
              <ul className="mt-4 space-y-2 border-t border-line pt-4 text-[13px]">
                <li className="flex justify-between"><span className="text-ink-3">{t("cvr.photos")}</span><b>{verified.length} {t("cvr.verifiedWord")}</b></li>
                <li className="flex justify-between"><span className="text-ink-3">{t("cvr.latest")}</span><b>{fmtDate(latest.captured_at ?? latest.created_at, lang)}</b></li>
                {issues > 0 && <li className="flex justify-between"><span className="text-ink-3">{t("cvr.concerns")}</span><b>{issues}</b></li>}
              </ul>
            </>
          ) : (
            <p className="mt-3 rounded-xl bg-surface-muted p-4 text-sm text-ink-2">{d.pending_reports ? t("ev.emptyPending", { n: d.pending_reports }) : t("cvr.noEvidence")}</p>
          )}
          {ch && (
            <p className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-[13px] text-ink-2"><Satellite className="mt-0.5 size-4 shrink-0 text-navy" />
              {t("cvr.sat", { level: t(`sat.level.${ch.level}` as MsgKey).toLowerCase(), a: fmtDate(ch.before_date, lang, false), b: fmtDate(ch.after_date, lang, false) })}</p>
          )}
        </section>
      </div>

      {ts.known && ts.days_late !== undefined && (
        <div className="card mt-3 flex flex-wrap items-center gap-x-8 gap-y-2 px-5 py-4 text-sm">
          <div><p className="kicker">{t("card.expected")}</p><p className="font-bold text-ink">{fmtDate(ts.expected, lang)}</p></div>
          <ArrowRight className="hidden size-4 text-ink-3 sm:block" />
          <div><p className="kicker">{ts.completed ? t("cvr.completedOn") : t("cvr.today")}</p><p className="font-bold text-ink">{fmtDate(ts.completed ? s.actual_completion : new Date().toISOString(), lang)}</p></div>
          <p className={`ml-auto rounded-lg px-3 py-1.5 text-sm font-extrabold ${ts.days_late > 0 ? "bg-red-soft text-red" : "bg-green-soft text-green"}`}>
            {ts.days_late > 0 ? t("cvr.daysAfter", { n: ts.days_late }) : t("cvr.onTime")}
          </p>
        </div>
      )}
      <p className="mt-3 rounded-lg border border-line bg-surface-muted/60 px-4 py-3 text-[13px] leading-relaxed text-ink-2"><b className="text-ink">{t("cvr.reads")}:</b> {t(verdictKey)}</p>
    </div>
  );
}
