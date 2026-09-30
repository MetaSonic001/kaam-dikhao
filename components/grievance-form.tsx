"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Button, Input, Label, Select, Textarea, useToast } from "./ui";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";

export function GrievanceForm({ email }: { email: string }) {
  const t = useT();
  const toast = useToast();
  const sp = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reference: string; message: string } | null>(null);
  const [f, setF] = useState({ reason: "inaccurate", target_url: sp.get("target") ? `report:${sp.get("target")}` : "", details: "", contact_name: "", contact_email: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { setDone(await api("/api/takedowns", { json: f })); } catch (er) { toast((er as Error).message, "error"); } finally { setBusy(false); }
  };

  if (done) return <div className="card border-green/30 bg-green-soft p-6"><Check className="size-8 text-green" /><h3 className="mt-2 text-lg font-bold text-ink">{t("gr.done")}</h3><p className="mt-1 text-sm text-ink-2">{done.message}</p><p className="mt-3 text-sm font-bold text-ink">{t("gr.ref")}: {done.reference}</p></div>;

  return (
    <form onSubmit={submit} className="card space-y-4 p-5 sm:p-6">
      <p className="text-sm text-ink-2">{t("gr.officer")}: <a href={`mailto:${email}`} className="font-semibold text-blue">{email}</a></p>
      <div><Label>{t("gr.reason")}</Label>
        <Select value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>{["inaccurate", "defamatory", "personal", "copyright", "other"].map((r) => <option key={r} value={r}>{t(`gr.r.${r}` as never)}</option>)}</Select></div>
      <div><Label hint={t("common.optional")}>{t("gr.url")}</Label><Input value={f.target_url} onChange={(e) => setF({ ...f, target_url: e.target.value })} placeholder="https://" /></div>
      <div><Label>{t("gr.details")}</Label><Textarea required minLength={10} maxLength={3000} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><Label hint={t("common.optional")}>{t("gr.name")}</Label><Input value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></div><div><Label>{t("gr.email")}</Label><Input required type="email" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></div></div>
      <Button type="submit" loading={busy} size="lg" className="w-full">{t("gr.submit")}</Button>
    </form>
  );
}
