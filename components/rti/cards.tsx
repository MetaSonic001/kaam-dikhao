"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge } from "../ui";
import { fmtDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { RtiItem } from "@/lib/types";
import type { MsgKey } from "@/lib/messages";

const TONE: Record<string, "green" | "amber" | "red" | "blue" | "gray"> = { FULL: "green", PARTIAL: "amber", REJECTED: "red", TRANSFERRED: "blue", NO_RESPONSE: "red", PENDING: "gray" };

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const { t } = useI18n();
  return <Badge tone={TONE[outcome] ?? "gray"}>{t(`rti.o.${outcome}` as MsgKey)}</Badge>;
}

export function RtiCard({ r }: { r: RtiItem }) {
  const { t, lang } = useI18n();
  return (
    <Link href={`/rti/${r.id}`} className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
      <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-ink-3">{r.reference ?? t("rti.noRef")}</p><OutcomeBadge outcome={r.outcome} /></div>
      <h3 className="mt-1.5 text-[16px] font-bold leading-snug text-ink">{r.subject}</h3>
      <p className="mt-1 text-[13px] text-ink-2">{r.authority}{r.city ? ` · ${r.city}` : ""}</p>
      {r.summary_ai && <p className="mt-2 line-clamp-2 text-[13px] text-ink-2">{r.summary_ai}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-ink-3">
        <span>{t("rti.filed")}: <b className="text-ink-2">{fmtDate(r.filed_on, lang)}</b></span>
        <span>{t("rti.replied")}: <b className="text-ink-2">{fmtDate(r.response_on, lang)}</b></span>
        {r.days_taken != null && <span className={`inline-flex items-center gap-1 font-semibold ${r.within_30_days ? "text-green" : "text-amber"}`}><Clock className="size-3" />{t("rti.days", { n: r.days_taken })}</span>}
      </div>
    </Link>
  );
}
