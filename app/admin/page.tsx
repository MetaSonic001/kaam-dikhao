"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Flag, RefreshCw, X } from "lucide-react";
import { AiBadge } from "@/components/badges";
import { Badge, Button, EmptyState, Input, Skeleton, Tabs, useToast } from "@/components/ui";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtCoord, fmtDate, fmtDistance } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Queue = { reports: any[]; documents: any[]; rtis: any[]; replies: any[]; takedowns: any[] };
type Tab = "reports" | "documents" | "rtis" | "replies" | "takedowns" | "audit" | "ops";

export default function Admin() {
  const { t, lang } = useI18n();
  const { token, me, ready } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState<Queue | null>(null);
  const [tab, setTab] = useState<Tab>("reports");
  const [audit, setAudit] = useState<any[]>([]);
  const [sync, setSync] = useState<any>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try { setQ(await api<Queue>("/api/mod/queue", { token })); } catch (e) { toast((e as Error).message, "error"); }
  }, [token, toast]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (tab === "audit" && token) api<any[]>("/api/mod/audit", { token }).then(setAudit).catch(() => {}); if (tab === "ops") api("/api/sync-status").then(setSync).catch(() => {}); }, [tab, token]);

  if (!ready) return <div className="wrap py-10"><Skeleton className="h-64 w-full" /></div>;
  if (!token || !me || !(me.role === "admin" || me.role === "moderator")) return <div className="wrap py-16"><EmptyState title={t("admin.denied")} text={t("admin.deniedSub")} action={<Button href="/login?next=/admin">{t("nav.signIn")}</Button>} /></div>;

  const act = async (path: string, body: object, id: string) => {
    setBusy(id);
    try { await api(path, { token, json: body }); toast(t("admin.saved")); await load(); } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(null); }
  };
  const reason = (id: string) => reasons[id] ?? "";
  const counts = q ? { reports: q.reports.length, documents: q.documents.length, rtis: q.rtis.length, replies: q.replies.length, takedowns: q.takedowns.length } : null;
  const tabs: { id: Tab; label: React.ReactNode }[] = (["reports", "documents", "rtis", "replies", "takedowns"] as const).map((k) => ({ id: k, label: <>{t(`admin.${k}` as never)}{counts && counts[k] > 0 && <span className="ml-1.5 rounded-full bg-orange px-1.5 py-0.5 text-[11px] text-white">{counts[k]}</span>}</> }));
  tabs.push({ id: "audit", label: t("admin.audit") }, { id: "ops", label: t("admin.ops") });

  const ReasonBox = ({ id }: { id: string }) => <Input placeholder={t("admin.reasonPh")} value={reason(id)} onChange={(e) => setReasons({ ...reasons, [id]: e.target.value })} />;

  return (
    <div className="wrap py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy">{t("admin.title")}</h1>
      <p className="mt-1 text-ink-2">{t("admin.sub")}</p>
      <Tabs<Tab> tabs={tabs} value={tab} onChange={setTab} className="mt-5" />

      <div className="mt-6">
        {tab === "reports" && (!q ? <Skeleton className="h-48" /> : q.reports.length === 0 ? <EmptyState icon={<Check className="size-6" />} title={t("admin.clear")} text={t("admin.clearSub")} /> : (
          <ul className="space-y-4">
            {q.reports.map((r) => (
              <li key={r.id} className="card grid gap-4 p-4 md:grid-cols-[260px_1fr]">
                {r.media_url ? <a href={mediaUrl(r.media_url)} target="_blank" rel="noreferrer"><img src={mediaUrl(r.thumb_url ?? r.media_url)} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" /></a> : <div className="grid aspect-[4/3] place-items-center rounded-lg bg-surface-muted text-sm text-ink-3">{r.kind}</div>}
                <div className="space-y-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><Link href={`/projects/${r.site_slug}`} className="font-bold text-ink hover:underline">{r.site_title}</Link><Badge tone={r.site_origin === "citizen" ? "amber" : "blue"}>{r.site_origin}{!r.site_published ? " · new place" : ""}</Badge>{r.observation && <Badge>{r.observation}</Badge>}</div>
                  <dl className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
                    <div><dt className="inline text-ink-3">GPS: </dt><dd className="inline font-medium">{r.lat != null ? fmtCoord(r.lat, r.lng) : "—"} ({r.location_source})</dd></div>
                    <div><dt className="inline text-ink-3">{t("ev.distance")}: </dt><dd className="inline font-medium">{fmtDistance(r.distance_to_site_m)}</dd></div>
                    <div><dt className="inline text-ink-3">{t("ev.captured")}: </dt><dd className="inline font-medium">{fmtDate(r.captured_at, lang)}</dd></div>
                    <div><dt className="inline text-ink-3">{t("admin.submitted")}: </dt><dd className="inline font-medium">{fmtDate(r.created_at, lang)}</dd></div>
                  </dl>
                  {r.flags?.length > 0 && <p className="flex flex-wrap items-center gap-1.5"><Flag className="size-3.5 text-amber" />{r.flags.map((f: string) => <Badge key={f} tone="amber">{f}</Badge>)}</p>}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-muted p-2.5"><p className="kicker">{t("admin.original")}</p><p className="text-[13px] text-ink-2">{r.note_original || "—"}</p></div>
                    <div className="rounded-lg bg-green-soft p-2.5"><p className="kicker">{t("admin.publicNote")}</p><p className="text-[13px] text-ink">{r.note_public || "—"}</p></div>
                  </div>
                  {r.ai?.visible && <div className="rounded-lg border border-line p-2.5"><AiBadge /><p className="mt-1 text-[13px] text-ink-2">{r.ai.visible.join(" · ")} {r.ai.confidence != null && `(${Math.round(r.ai.confidence * 100)}%)`}</p></div>}
                  <ReasonBox id={r.id} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" loading={busy === r.id} onClick={() => act(`/api/mod/reports/${r.id}`, { action: "approve", reason: reason(r.id) }, r.id)}><Check className="size-4" />{t("admin.approve")}</Button>
                    <Button size="sm" variant="outline" onClick={() => act(`/api/mod/reports/${r.id}`, { action: "more_evidence", reason: reason(r.id) }, r.id)}>{t("admin.more")}</Button>
                    <Button size="sm" variant="outline" onClick={() => act(`/api/mod/reports/${r.id}`, { action: "dispute", reason: reason(r.id) }, r.id)}>{t("admin.dispute")}</Button>
                    <Button size="sm" variant="danger" onClick={() => act(`/api/mod/reports/${r.id}`, { action: "reject", reason: reason(r.id) }, r.id)}><X className="size-4" />{t("admin.reject")}</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ))}

        {tab === "documents" && (!q || q.documents.length === 0 ? <EmptyState title={t("admin.clear")} /> : q.documents.map((d) => (
          <div key={d.id} className="card mb-3 space-y-2 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><b>{d.site_title ?? "—"}</b><Badge>{d.kind}</Badge>{d.file_url && <a className="inline-flex items-center gap-1 font-semibold text-blue" href={mediaUrl(d.file_url)} target="_blank" rel="noreferrer">{t("common.open")}<ExternalLink className="size-3" /></a>}</div>
            <pre className="overflow-x-auto rounded-lg bg-surface-muted p-3 text-xs">{JSON.stringify(d.extracted, null, 2)}</pre>
            <ReasonBox id={d.id} />
            <div className="flex gap-2"><Button size="sm" loading={busy === d.id} onClick={() => act(`/api/mod/documents/${d.id}`, { action: "approve", reason: reason(d.id) }, d.id)}>{t("admin.approveApply")}</Button><Button size="sm" variant="danger" onClick={() => act(`/api/mod/documents/${d.id}`, { action: "reject", reason: reason(d.id) }, d.id)}>{t("admin.reject")}</Button></div>
          </div>
        )))}

        {tab === "rtis" && (!q || q.rtis.length === 0 ? <EmptyState title={t("admin.clear")} /> : q.rtis.map((r) => (
          <div key={r.id} className="card mb-3 space-y-2 p-4 text-sm"><b>{r.subject}</b><p className="text-ink-2">{r.authority} · {r.outcome}</p><p className="whitespace-pre-line text-[13px] text-ink-2">{r.question_text}</p>{r.summary_ai && <p className="rounded-lg bg-surface-muted p-2.5 text-[13px]"><AiBadge /> {r.summary_ai}</p>}
            <div className="flex gap-2"><Button size="sm" onClick={() => act(`/api/mod/rtis/${r.id}`, { action: "approve" }, r.id)}>{t("admin.approve")}</Button><Button size="sm" variant="danger" onClick={() => act(`/api/mod/rtis/${r.id}`, { action: "reject" }, r.id)}>{t("admin.reject")}</Button></div></div>
        )))}

        {tab === "replies" && (!q || q.replies.length === 0 ? <EmptyState title={t("admin.clear")} /> : q.replies.map((r) => (
          <div key={r.id} className="card mb-3 space-y-2 p-4 text-sm"><div className="flex flex-wrap gap-2"><b>{r.org}</b><Badge>{r.stance}</Badge><span className="text-ink-3">{r.author_name} · {r.designation} · {r.contact_email}</span></div><p>{r.body}</p><p className="text-xs text-ink-3">{r.site_title}</p>
            <div className="flex gap-2"><Button size="sm" onClick={() => act(`/api/mod/replies/${r.id}`, { action: "approve" }, r.id)}>{t("admin.publish")}</Button><Button size="sm" variant="danger" onClick={() => act(`/api/mod/replies/${r.id}`, { action: "reject" }, r.id)}>{t("admin.reject")}</Button></div></div>
        )))}

        {tab === "takedowns" && (!q || q.takedowns.length === 0 ? <EmptyState title={t("admin.clear")} /> : q.takedowns.map((d) => (
          <div key={d.id} className="card mb-3 space-y-2 p-4 text-sm"><div className="flex flex-wrap gap-2"><Badge tone="amber">{d.reason}</Badge><Badge>{d.status}</Badge><span className="text-xs text-ink-3">{fmtDate(d.created_at, lang)} · {d.contact_email}</span></div><p>{d.details}</p>{d.target_url && <p className="text-xs text-ink-3">{d.target_url}</p>}
            <ReasonBox id={d.id} /><div className="flex gap-2"><Button size="sm" onClick={() => act(`/api/mod/takedowns/${d.id}`, { status: "ACTIONED", resolution: reason(d.id) }, d.id)}>{t("admin.actioned")}</Button><Button size="sm" variant="outline" onClick={() => act(`/api/mod/takedowns/${d.id}`, { status: "REJECTED", resolution: reason(d.id) }, d.id)}>{t("admin.declined")}</Button></div></div>
        )))}

        {tab === "audit" && <div className="card overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-surface-muted text-ink-3"><tr><th className="p-3">{t("admin.when")}</th><th>{t("admin.who")}</th><th>{t("admin.what")}</th><th>{t("admin.change")}</th><th>{t("admin.why")}</th></tr></thead><tbody className="divide-y divide-line">{audit.map((a) => <tr key={a.id}><td className="p-3 whitespace-nowrap">{fmtDate(a.at, lang)}</td><td>{a.actor_role}</td><td className="font-semibold">{a.action}</td><td className="max-w-xs truncate">{JSON.stringify(a.before)} → {JSON.stringify(a.after)}</td><td>{a.reason}</td></tr>)}</tbody></table></div>}

        {tab === "ops" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button loading={busy === "sync"} onClick={() => act("/api/admin/sync", {}, "sync")}><RefreshCw className="size-4" />{t("admin.syncAll")}</Button>
              <Button variant="outline" href="/transparency">{t("nav.transparency")}</Button>
            </div>
            {sync?.sources?.map((s: any) => (
              <div key={s.key} className="card p-4 text-sm"><p className="font-bold">{s.name}</p>{s.runs.length ? <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">{s.runs.map((r: any) => <li key={r.scope} className="flex justify-between rounded bg-surface-muted px-2 py-1"><span>{r.scope}</span><span className={r.ok ? "text-green" : "text-red"}>{r.ok ? "ok" : "failed"} · {r.items} · {r.detail}</span></li>)}</ul> : <p className="text-xs text-ink-3">{s.update}</p>}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
