"use client";

import Link from "next/link";
import { Camera, MapPin, Navigation } from "lucide-react";
import { CategoryChip, OriginBadge, StatusBadge } from "./badges";
import { useI18n } from "@/lib/i18n";
import { fmtDate, fmtDistance, fmtInr } from "@/lib/format";
import type { SiteListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function daysLate(iso: string | null) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 86400000);
  return d > 0 ? d : null;
}

export function SiteCard({ site, className, compact = false }: { site: SiteListItem; className?: string; compact?: boolean }) {
  const { t, lang } = useI18n();
  const late = site.status === "DELAYED" ? daysLate(site.expected_completion) : null;
  const where = [site.locality, site.ward, site.city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" · ");
  return (
    <Link href={`/projects/${site.slug}`} className={cn("card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]", className)}>
      <div className="flex items-start justify-between gap-2">
        <CategoryChip category={site.category} />
        <StatusBadge status={site.status} />
      </div>
      <h3 className="mt-2 text-[16px] font-bold leading-snug text-ink group-hover:text-navy">{site.title}</h3>
      <p className="mt-1 flex items-center gap-1 text-[13px] text-ink-2"><MapPin className="size-3.5 shrink-0 text-ink-3" /><span className="truncate">{where || t("card.locating")}</span></p>

      {!compact && (site.agency || site.sanctioned_amount || site.expected_completion ? (
        <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3 text-[13px]">
          <div><dt className="kicker">{t("card.agency")}</dt><dd className="mt-0.5 line-clamp-2 font-medium text-ink">{site.agency ?? <span className="font-normal text-ink-3">{t("card.notPublished")}</span>}</dd></div>
          <div><dt className="kicker">{t("card.sanctioned")}</dt><dd className="mt-0.5 font-medium text-ink">{site.sanctioned_amount ? fmtInr(site.sanctioned_amount, lang) : <span className="font-normal text-ink-3">{t("card.notPublished")}</span>}</dd></div>
          <div><dt className="kicker">{t("card.expected")}</dt>
            <dd className="mt-0.5 font-medium text-ink">{site.expected_completion ? fmtDate(site.expected_completion, lang) : <span className="font-normal text-ink-3">{t("card.notPublished")}</span>}
              {late && <span className="block text-xs font-semibold text-red">{t("card.daysPast", { n: late })}</span>}</dd></div>
        </dl>
      ) : (
        <p className="mt-3 border-t border-line pt-3 text-[13px] text-ink-3">{t("card.noRecord")}</p>
      ))}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-2">
        <span className="flex items-center gap-1.5 font-medium">
          <Camera className="size-3.5" />
          {site.evidence_count > 0 ? t("card.evidence", { n: site.evidence_count }) : t("card.noEvidence")}
        </span>
        <span className="flex items-center gap-2">
          {site.distance_m != null && <span className="flex items-center gap-1 font-semibold text-blue"><Navigation className="size-3" />{fmtDistance(site.distance_m)}</span>}
          <OriginBadge origin={site.origin} />
        </span>
      </div>
    </Link>
  );
}

export function SiteCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="skeleton h-4 w-24" /><div className="skeleton mt-3 h-5 w-4/5" /><div className="skeleton mt-2 h-4 w-2/5" />
      <div className="skeleton mt-4 h-12 w-full" />
    </div>
  );
}
