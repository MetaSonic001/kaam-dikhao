import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleSlash, FileText, Landmark } from "lucide-react";
import { OutcomeBadge } from "@/components/rti/cards";
import { AiBadge } from "@/components/badges";
import { apiSafe, mediaUrl } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import type { RtiItem } from "@/lib/types";

export const dynamic = "force-dynamic";
type Detail = RtiItem & { question_text: string; response_text: string | null; document_url: string | null; site: { slug: string; title: string } | null; outcome_analysis: { response_received: boolean; statutory_days: number } };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = await apiSafe<Detail>(`/api/rti/${(await params).id}`);
  return { title: d ? `RTI: ${d.subject}` : "RTI not found" };
}

function Check({ ok, label, v }: { ok: boolean | null; label: string; v: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5"><span className="text-ink-2">{label}</span><span className={`inline-flex items-center gap-1.5 font-bold ${ok === null ? "text-ink-3" : ok ? "text-green" : "text-amber"}`}>{ok === null ? "—" : ok ? <CheckCircle2 className="size-4" /> : <CircleSlash className="size-4" />}{v}</span></li>
  );
}

export default async function RtiPage({ params }: { params: Promise<{ id: string }> }) {
  const d = await apiSafe<Detail>(`/api/rti/${(await params).id}`);
  if (!d) notFound();
  const { t, lang } = await getT();
  return (
    <div className="wrap max-w-4xl py-8">
      <nav className="mb-3 text-[13px] text-ink-3"><Link href="/rti" className="hover:text-ink">{t("nav.rti")}</Link> / {d.reference ?? t("rti.noRef")}</nav>
      <div className="flex flex-wrap items-center gap-2"><OutcomeBadge outcome={d.outcome} />{d.reference && <span className="text-sm font-semibold text-ink-3">{d.reference}</span>}</div>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy">{d.subject}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-ink-2"><Landmark className="size-4" />{d.authority}</p>

      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <section className="card p-5"><h2 className="text-sm font-bold text-ink">{t("rti.question")}</h2><p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{d.question_text}</p></section>
          {d.summary_ai && (
            <section className="card p-5"><div className="flex items-center gap-2"><h2 className="text-sm font-bold text-ink">{t("rti.learned")}</h2><AiBadge /></div><p className="mt-2 text-[15px] leading-relaxed text-ink">{d.summary_ai}</p><p className="mt-2 text-xs text-ink-3">{t("rti.aiNote")}</p></section>
          )}
          {d.response_text && <section className="card p-5"><h2 className="text-sm font-bold text-ink">{t("rti.reply")}</h2><p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line text-[13px] leading-relaxed text-ink-2">{d.response_text}</p></section>}
          {d.document_url && <a href={mediaUrl(d.document_url)} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 p-4 font-semibold text-blue hover:underline"><FileText className="size-5" />{t("rti.original")}</a>}
        </div>
        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-bold text-ink">{t("rti.analysis")}</h2>
            <ul className="mt-2 divide-y divide-line text-[13px]">
              <Check ok={d.outcome_analysis.response_received} label={t("rti.received")} v={d.outcome_analysis.response_received ? t("common.yes") : t("common.no")} />
              <Check ok={d.days_taken == null ? null : d.within_30_days} label={t("rti.within30")} v={d.days_taken == null ? "—" : `${d.days_taken} ${t("rti.daysWord")}`} />
              <Check ok={d.outcome === "FULL" ? true : d.outcome === "PENDING" ? null : d.outcome === "PARTIAL" || d.outcome === "REJECTED" ? false : null} label={t("rti.complete")} v={t(`rti.o.${d.outcome}` as never)} />
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-ink-3"><div className="flex justify-between"><dt>{t("rti.filed")}</dt><dd className="font-semibold text-ink-2">{fmtDate(d.filed_on, lang)}</dd></div><div className="flex justify-between"><dt>{t("rti.replied")}</dt><dd className="font-semibold text-ink-2">{fmtDate(d.response_on, lang)}</dd></div></dl>
          </div>
          {d.site && <Link href={`/projects/${d.site.slug}`} className="card block p-4 text-sm hover:shadow-[var(--shadow-float)]"><p className="kicker">{t("rti.relatedProject")}</p><p className="mt-1 font-bold text-ink">{d.site.title}</p></Link>}
        </aside>
      </div>
    </div>
  );
}
