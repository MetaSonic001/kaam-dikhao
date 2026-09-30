"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, Bell, Camera, FileSearch, Shield } from "lucide-react";
import { EvidenceStateBadge } from "@/components/badges";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { ReportStatus } from "@/lib/types";

type Mine = { id: string; kind: string; observation: string | null; note_public: string | null; thumb_url: string | null; status: ReportStatus; moderation_reason: string | null; created_at: string; moderated_at: string | null; site_slug: string; site_title: string };

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { token, me, ready, session } = useAuth();
  const [mine, setMine] = useState<Mine[] | null>(null);

  useEffect(() => { if (token) api<Mine[]>("/api/reports/mine", { token }).then(setMine).catch(() => setMine([])); }, [token]);

  if (!ready) return <div className="wrap py-10"><Skeleton className="h-40 w-full" /></div>;
  if (!session) return <div className="wrap py-16"><EmptyState title={t("dash.signIn")} text={t("dash.signInSub")} action={<Button href="/login?next=/dashboard">{t("nav.signIn")}</Button>} /></div>;

  const stages: ReportStatus[] = ["SUBMITTED", "UNDER_REVIEW", "VERIFIED"];
  return (
    <div className="wrap py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="kicker">{t("dash.welcome")}</p><h1 className="text-3xl font-extrabold tracking-tight text-navy">{session.user.email}</h1></div>
        <div className="flex gap-2"><Button href="/report"><Camera className="size-4" />{t("nav.report")}</Button><Button href="/rti/new" variant="soft"><FileSearch className="size-4" />{t("footer.fileRti")}</Button>{me && (me.role === "admin" || me.role === "moderator") && <Button href="/admin" variant="outline"><Shield className="size-4" />{t("nav.admin")}</Button>}</div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[[t("dash.submissions"), me?.submissions ?? 0, Camera], [t("dash.verified"), me?.verified ?? 0, BadgeCheck], [t("dash.following"), me?.following.length ?? 0, Bell]].map(([l, v, I]) => {
          const Icon = I as typeof Camera;
          return <div key={l as string} className="card flex items-center gap-4 p-5"><span className="grid size-11 place-items-center rounded-xl bg-orange-soft text-orange-dark"><Icon className="size-5" /></span><div><p className="text-2xl font-extrabold text-navy">{v as number}</p><p className="text-sm text-ink-2">{l as string}</p></div></div>;
        })}
      </div>

      <h2 className="mb-3 mt-10 text-xl font-bold text-ink">{t("dash.myReports")}</h2>
      {mine === null ? <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div> :
        mine.length === 0 ? <EmptyState icon={<Camera className="size-6" />} title={t("dash.noReports")} text={t("dash.noReportsSub")} action={<Button href="/report">{t("nav.report")}</Button>} /> :
        <ul className="space-y-3">
          {mine.map((r) => {
            const idx = r.status === "VERIFIED" || r.status === "DISPUTED" ? 2 : r.status === "REJECTED" ? 2 : r.status === "UNDER_REVIEW" ? 1 : 0;
            return (
              <li key={r.id} className="card flex gap-4 p-4">
                {r.thumb_url && <img src={mediaUrl(r.thumb_url)} alt="" className="size-20 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><Link href={`/projects/${r.site_slug}`} className="font-bold text-ink hover:underline">{r.site_title}</Link><EvidenceStateBadge status={r.status} /></div>
                  <p className="text-xs text-ink-3">{fmtDate(r.created_at, lang)}{r.moderated_at && ` · ${t("dash.reviewed")} ${fmtDate(r.moderated_at, lang)}`}</p>
                  {r.note_public && <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{r.note_public}</p>}
                  {r.moderation_reason && <p className="mt-1 text-[13px] text-amber">{t("dash.reason")}: {r.moderation_reason}</p>}
                  <ol className="mt-2 flex gap-1.5" aria-label="Progress">{stages.map((s, i) => <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? (r.status === "REJECTED" ? "bg-red" : "bg-green") : "bg-surface-muted"}`} />)}</ol>
                </div>
              </li>
            );
          })}
        </ul>}

      {me && me.following.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-xl font-bold text-ink">{t("dash.following")}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">{me.following.map((f) => <li key={f.slug}><Link href={`/projects/${f.slug}`} className="card block p-3 text-sm font-semibold text-ink hover:shadow-[var(--shadow-float)]">{f.title}</Link></li>)}</ul>
        </>
      )}
    </div>
  );
}
