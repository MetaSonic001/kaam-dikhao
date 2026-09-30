"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera, CheckCircle2, MapPin, Clock, Flag } from "lucide-react";
import { AiBadge, EvidenceStateBadge } from "../badges";
import { Badge, Button, EmptyState, Modal } from "../ui";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtCoord, fmtDate, fmtDistance } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Report } from "@/lib/types";
import type { MsgKey } from "@/lib/messages";

const OBS_TONE = { progress: "blue", completed: "green", issue: "amber", not_started: "gray", other: "gray" } as const;

export function EvidenceGallery({ reports, pending, mine: mineProp, siteId }: { reports: Report[]; pending: number; mine: Report[]; siteId: string }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<Report | null>(null);
  const { token } = useAuth();
  const [mine, setMine] = useState<Report[]>(mineProp);
  useEffect(() => { if (token) api<{ my_reports: Report[] }>(`/api/sites/${siteId}`, { token }).then((d) => setMine(d.my_reports)).catch(() => {}); }, [token, siteId]);
  return (
    <div>
      {reports.length === 0 ? (
        <EmptyState icon={<Camera className="size-6" />} title={t("ev.empty")} text={pending ? t("ev.emptyPending", { n: pending }) : t("ev.emptySub")} action={<Button href={`/report?site=${siteId}`}>{t("nav.report")}</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {reports.map((r) => (
            <button key={r.id} onClick={() => setOpen(r)} className="card group overflow-hidden text-left transition hover:shadow-[var(--shadow-float)]">
              <div className="relative">
                <img src={mediaUrl(r.thumb_url ?? r.media_url)} alt={r.note_public ?? t("ev.photoAlt")} loading="lazy" className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.03]" />
                <div className="absolute left-2 top-2"><EvidenceStateBadge status={r.status} /></div>
              </div>
              <div className="space-y-1 p-3">
                <div className="flex items-center gap-2 text-xs text-ink-2"><Clock className="size-3.5" />{fmtDate(r.captured_at ?? r.created_at, lang)}
                  {r.distance_to_site_m != null && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{t("ev.away", { d: fmtDistance(r.distance_to_site_m) })}</span>}</div>
                {r.observation && <Badge tone={OBS_TONE[r.observation]}>{t(`obs.${r.observation}` as MsgKey)}</Badge>}
                {r.note_public && <p className="line-clamp-2 text-[13px] text-ink">{r.note_public}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
      {pending > 0 && reports.length > 0 && <p className="mt-3 text-[13px] text-ink-3">{t("ev.pending", { n: pending })}</p>}
      {mine.length > 0 && (
        <div className="mt-5 rounded-xl border border-blue/20 bg-blue-soft p-4">
          <p className="text-sm font-bold text-blue">{t("ev.mine")}</p>
          <ul className="mt-2 space-y-1.5 text-[13px] text-ink-2">
            {mine.map((r) => <li key={r.id} className="flex items-center gap-2"><EvidenceStateBadge status={r.status} />{fmtDate(r.created_at, lang)}{r.moderation_reason && <span className="text-ink-3">— {r.moderation_reason}</span>}</li>)}
          </ul>
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} wide title={t("ev.detail")}>
        {open && (
          <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
            <img src={mediaUrl(open.media_url)} alt={open.note_public ?? t("ev.photoAlt")} className="w-full rounded-xl bg-surface-muted object-contain" />
            <div className="space-y-4 text-sm">
              <EvidenceStateBadge status={open.status} />
              {open.note_public && <p className="text-[15px] text-ink">“{open.note_public}”</p>}
              <dl className="space-y-2 text-[13px]">
                <Row k={t("ev.captured")} v={fmtDate(open.captured_at ?? open.created_at, lang)} />
                {open.lat != null && open.lng != null && <Row k={t("ev.gps")} v={`${fmtCoord(open.lat, open.lng)} · ${t(`ev.loc.${open.location_source ?? "device"}` as MsgKey)}`} />}
                {open.distance_to_site_m != null && <Row k={t("ev.distance")} v={fmtDistance(open.distance_to_site_m)} />}
                <Row k={t("ev.by")} v={t("ev.byValue")} />
              </dl>
              <div className="rounded-xl border border-line p-3">
                <p className="mb-2 flex items-center gap-1.5 font-bold text-ink"><CheckCircle2 className="size-4 text-green" />{t("ev.why")}</p>
                <ul className="space-y-1 text-[13px] text-ink-2">
                  <li>✓ {open.lat != null ? t("ev.chk.gps") : t("ev.chk.nogps")}</li>
                  <li>✓ {open.captured_at ? t("ev.chk.time") : t("ev.chk.notime")}</li>
                  <li>✓ {t("ev.chk.match")}</li>
                  <li>✓ {t("ev.chk.dup")}</li>
                  <li>✓ {t("ev.chk.mod", { d: fmtDate(open.moderated_at, lang) })}</li>
                </ul>
              </div>
              {open.ai?.visible && open.ai.visible.length > 0 && (
                <div className="rounded-xl bg-surface-muted p-3">
                  <AiBadge />
                  <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[13px] text-ink-2">{open.ai.visible.map((v) => <li key={v}>{v}</li>)}</ul>
                </div>
              )}
              <p className="rounded-lg bg-amber-soft p-2.5 text-xs text-amber">{t("ev.notFact")}</p>
              <Link href={`/legal?target=${open.id}#grievance`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:text-red"><Flag className="size-3.5" />{t("ev.flag")}</Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-ink-3">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd></div>;
}
