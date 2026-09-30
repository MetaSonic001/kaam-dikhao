"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Button, EmptyState, Input, Label, Textarea, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function ShareRti() {
  const t = useT();
  const { token, ready } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ message: string; summary?: string | null } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  if (ready && !token) return <div className="wrap py-16"><EmptyState title={t("rtis.signIn")} text={t("rtis.signInSub")} action={<Button href="/login?next=/rti/share">{t("nav.signIn")}</Button>} /></div>;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setBusy(true);
    const fd = new FormData(e.currentTarget);
    if (file) fd.set("reply", file);
    try { setDone(await api("/api/rti", { token, form: fd })); } catch (er) { toast((er as Error).message, "error"); } finally { setBusy(false); }
  };

  if (done) return (
    <div className="wrap max-w-xl py-16"><div className="card p-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-green-soft text-green"><Check className="size-8" /></span>
      <h1 className="mt-4 text-2xl font-extrabold text-navy">{t("rtis.done")}</h1><p className="mt-2 text-ink-2">{done.message}</p>
      {done.summary && <p className="mt-4 rounded-lg bg-surface-muted p-3 text-left text-sm text-ink-2"><b className="text-ink">{t("rti.learned")}:</b> {done.summary}</p>}
      <Button href="/rti" className="mt-6">{t("rtis.back")}</Button></div></div>
  );

  return (
    <div className="wrap max-w-2xl py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy">{t("rtis.title")}</h1>
      <p className="mt-1 text-ink-2">{t("rtis.sub")}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><Label>{t("rtiw.authority")}</Label><Input name="authority" required minLength={3} placeholder={t("rtiw.authorityPh")} /></div>
        <div><Label>{t("rtis.subject")}</Label><Input name="subject" required minLength={5} maxLength={200} /></div>
        <div><Label>{t("rtis.questions")}</Label><Textarea name="question_text" required minLength={10} maxLength={4000} /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label hint={t("common.optional")}>{t("rtis.ref")}</Label><Input name="reference" /></div>
          <div><Label>{t("rti.filed")}</Label><Input type="date" name="filed_on" /></div>
          <div><Label>{t("rti.replied")}</Label><Input type="date" name="response_on" /></div>
        </div>
        <div><Label hint={t("rtis.replyHint")}>{t("rtis.reply")}</Label><Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="pt-2" /></div>
        <p className="flex items-start gap-2 rounded-lg bg-green-soft p-3 text-[13px] text-green"><ShieldCheck className="mt-0.5 size-4 shrink-0" />{t("rtis.privacy")}</p>
        <Button type="submit" size="lg" className="w-full" loading={busy}>{t("rtis.submit")}</Button>
      </form>
    </div>
  );
}
