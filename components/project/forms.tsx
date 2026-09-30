"use client";

import { useState } from "react";
import { FileUp, MessageSquareReply } from "lucide-react";
import { Button, Input, Label, Modal, Select, Textarea, useToast } from "../ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useRouter } from "next/navigation";

/** Right of reply: any department, agency or contractor can respond. It is shown beside the evidence, nothing is removed. */
export function ReplyForm({ siteId }: { siteId: string }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ org: "", author_name: "", designation: "", contact_email: "", body: "", stance: "response" });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api<{ message: string }>("/api/replies", { json: { ...f, site_id: siteId } }); toast(r.message); setOpen(false); setF({ ...f, body: "" }); }
    catch (er) { toast((er as Error).message, "error"); } finally { setBusy(false); }
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><MessageSquareReply className="size-4" />{t("reply.cta")}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("reply.title")}>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-[13px] text-ink-2">{t("reply.intro")}</p>
          <div><Label>{t("reply.stance")}</Label>
            <Select value={f.stance} onChange={(e) => setF({ ...f, stance: e.target.value })}>
              {["response", "dispute", "correction", "clarification"].map((s) => <option key={s} value={s}>{t(`reply.s.${s}` as never)}</option>)}
            </Select></div>
          <div><Label>{t("reply.org")}</Label><Input required minLength={2} value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} placeholder={t("reply.orgPh")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("reply.name")}</Label><Input value={f.author_name} onChange={(e) => setF({ ...f, author_name: e.target.value })} /></div>
            <div><Label>{t("reply.role")}</Label><Input value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} /></div>
          </div>
          <div><Label hint={t("reply.emailHint")}>{t("reply.email")}</Label><Input required type="email" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></div>
          <div><Label>{t("reply.body")}</Label><Textarea required minLength={10} maxLength={3000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
          <Button type="submit" loading={busy} className="w-full">{t("reply.submit")}</Button>
        </form>
      </Modal>
    </>
  );
}

export function DocumentForm({ siteId }: { siteId: string }) {
  const t = useT();
  const { token } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("work_order");
  const [src, setSrc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [res, setRes] = useState<Record<string, unknown> | null>(null);
  const start = () => { if (!token) router.push("/login?next=" + encodeURIComponent(window.location.pathname)); else setOpen(true); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const fd = new FormData(); fd.set("kind", kind); fd.set("source_url", src); if (file) fd.set("file", file);
    try { const r = await api<{ extracted: Record<string, unknown> }>(`/api/sites/${siteId}/documents`, { token, form: fd }); setRes(r.extracted); toast(t("doc.thanks")); }
    catch (er) { toast((er as Error).message, "error"); } finally { setBusy(false); }
  };
  return (
    <>
      <Button variant="outline" onClick={start}><FileUp className="size-4" />{t("doc.cta")}</Button>
      <Modal open={open} onClose={() => { setOpen(false); setRes(null); }} title={t("doc.title")}>
        {res ? (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-ink">{t("doc.extracted")}</p>
            <dl className="grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-3 text-[13px]">
              {Object.entries(res).filter(([k, v]) => v != null && !k.startsWith("_") && k !== "confidence").map(([k, v]) => <div key={k}><dt className="text-ink-3">{k.replace(/_/g, " ")}</dt><dd className="font-medium text-ink">{String(v)}</dd></div>)}
            </dl>
            <p className="text-xs text-ink-3">{t("doc.review")}</p>
            <Button className="w-full" onClick={() => { setOpen(false); setRes(null); }}>{t("common.done")}</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-[13px] text-ink-2">{t("doc.intro")}</p>
            <div><Label>{t("doc.kind")}</Label>
              <Select value={kind} onChange={(e) => setKind(e.target.value)}>{["tender", "work_order", "completion", "budget", "other"].map((k) => <option key={k} value={k}>{t(`doc.k.${k}` as never)}</option>)}</Select></div>
            <div><Label hint={t("doc.pdfHint")}>{t("doc.file")}</Label><Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="pt-2" /></div>
            <div><Label hint={t("common.optional")}>{t("doc.link")}</Label><Input type="url" placeholder="https://" value={src} onChange={(e) => setSrc(e.target.value)} /></div>
            <Button type="submit" loading={busy} disabled={!file && !src} className="w-full">{t("doc.submit")}</Button>
          </form>
        )}
      </Modal>
    </>
  );
}
