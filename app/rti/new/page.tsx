"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, Printer, Search, Share2 } from "lucide-react";
import { Button, Input, Label, Textarea, useToast } from "@/components/ui";
import { StatusBadge } from "@/components/badges";
import { api, qs } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { SiteListItem } from "@/lib/types";

type Draft = { authority: string; subject: string; questions: string[]; text: string; how_to_file: string[]; disclaimer: string; available_questions: Record<string, string> };

function Drafter() {
  const { t, lang } = useI18n();
  const sp = useSearchParams();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [site, setSite] = useState<SiteListItem | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SiteListItem[]>([]);
  const [authority, setAuthority] = useState("");
  const [keys, setKeys] = useState<string[]>([]);
  const [avail, setAvail] = useState<Record<string, string>>({});
  const [applicant, setApplicant] = useState({ name: "", address: "" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { const id = sp.get("site"); if (id) api<{ site: SiteListItem }>(`/api/sites/${id}`).then((r) => setSite(r.site)).catch(() => {}); }, [sp]);
  useEffect(() => { if (q.length < 2) { setResults([]); return; } const h = setTimeout(() => api<{ items: SiteListItem[] }>(`/api/sites${qs({ q, limit: 6 })}`).then((r) => setResults(r.items)), 250); return () => clearTimeout(h); }, [q]);

  const generate = useCallback(async (k: string[]) => {
    setBusy(true);
    try {
      const d = await api<Draft>("/api/rti/draft", { json: { site_id: site?.id, authority: authority || undefined, keys: k, applicant, lang } });
      setDraft(d); setText(d.text); setAvail(d.available_questions);
      if (!authority) setAuthority(d.authority);
      return d;
    } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  }, [site, authority, applicant, lang, toast]);

  const toStep2 = async () => { const d = await generate([]); if (d) { setKeys(Object.entries(d.available_questions).filter(([, v]) => d.questions.includes(v)).map(([k]) => k)); setStep(2); } };
  const toStep3 = async () => { await generate(keys); setStep(3); };
  const toggle = (k: string) => setKeys((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]));

  const copy = async () => { await navigator.clipboard.writeText(text); toast(t("rtiw.copied")); };
  const download = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); a.download = "rti-application.txt"; a.click(); };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");

  return (
    <div className="wrap max-w-3xl py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy">{t("rtiw.title")}</h1>
      <p className="mt-1 text-ink-2">{t("rtiw.sub")}</p>
      <p className="mt-3 rounded-lg bg-blue-soft p-3 text-[13px] font-medium text-blue">{t("rtiw.weDraft")}</p>

      <ol className="my-6 flex items-center gap-2 text-sm">
        {[t("rtiw.s1"), t("rtiw.s2"), t("rtiw.s3")].map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("grid size-7 place-items-center rounded-full text-xs font-bold", step > i + 1 ? "bg-green text-white" : step === i + 1 ? "bg-orange text-white" : "bg-surface-muted text-ink-3")}>{step > i + 1 ? <Check className="size-4" /> : i + 1}</span>
            <span className={cn("hidden font-semibold sm:block", step === i + 1 ? "text-ink" : "text-ink-3")}>{s}</span>{i < 2 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <Label>{t("rtiw.project")}</Label>
            {site ? (
              <div className="card flex items-center justify-between gap-3 p-4"><div><p className="font-bold text-ink">{site.title}</p><p className="text-xs text-ink-3">{[site.locality, site.city].filter(Boolean).join(", ")}</p></div><div className="flex items-center gap-2"><StatusBadge status={site.status} /><button onClick={() => setSite(null)} className="text-sm font-semibold text-blue">{t("common.change")}</button></div></div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3"><Search className="size-4 text-ink-3" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("rtiw.projectPh")} className="h-10 w-full bg-transparent text-sm outline-none" /></div>
                {results.length > 0 && <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-float)]">{results.map((r) => <li key={r.id}><button onClick={() => { setSite(r); setQ(""); setResults([]); }} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-surface-muted"><b>{r.title}</b> <span className="text-ink-3">· {r.locality}, {r.city}</span></button></li>)}</ul>}
                <p className="mt-1 text-xs text-ink-3">{t("rtiw.projectHint")}</p>
              </div>
            )}
          </div>
          <div><Label hint={t("rtiw.authorityHint")}>{t("rtiw.authority")}</Label><Input value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder={t("rtiw.authorityPh")} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label hint={t("common.optional")}>{t("rtiw.name")}</Label><Input value={applicant.name} onChange={(e) => setApplicant({ ...applicant, name: e.target.value })} /></div>
            <div><Label hint={t("common.optional")}>{t("rtiw.address")}</Label><Input value={applicant.address} onChange={(e) => setApplicant({ ...applicant, address: e.target.value })} /></div>
          </div>
          <p className="text-xs text-ink-3">{t("rtiw.localOnly")}</p>
          <Button size="lg" className="w-full" loading={busy} disabled={!site && !authority} onClick={toStep2}>{t("common.continue")}</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-ink-2">{t("rtiw.pick")}</p>
          <ul className="space-y-2">
            {Object.entries(avail).map(([k, v]) => (
              <li key={k}><label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-surface p-3.5", keys.includes(k) ? "border-orange bg-orange-soft/40" : "border-line")}><input type="checkbox" className="mt-1 accent-orange" checked={keys.includes(k)} onChange={() => toggle(k)} /><span className="text-[14px] text-ink">{v}</span></label></li>
            ))}
          </ul>
          <div className="flex gap-3"><Button variant="outline" onClick={() => setStep(1)}>{t("common.back")}</Button><Button className="flex-1" loading={busy} disabled={keys.length === 0} onClick={toStep3}>{t("rtiw.generate")}</Button></div>
        </div>
      )}

      {step === 3 && draft && (
        <div className="space-y-5">
          <div><Label>{t("rtiw.edit")}</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[26rem] font-mono text-[13px] leading-relaxed" /></div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={copy}><Copy className="size-4" />{t("rtiw.copy")}</Button>
            <Button variant="outline" onClick={download}><Download className="size-4" />{t("rtiw.download")}</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />{t("rtiw.print")}</Button>
            <Button variant="outline" onClick={whatsapp}><Share2 className="size-4" />WhatsApp</Button>
          </div>
          <div className="card p-5">
            <h2 className="font-bold text-ink">{t("rtiw.howTitle")}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-ink-2">{draft.how_to_file.map((h) => <li key={h}>{h}</li>)}</ol>
            <div className="mt-4 flex flex-wrap gap-2"><Button href="https://rtionline.gov.in" variant="soft">rtionline.gov.in <ExternalLink className="size-3.5" /></Button><Button href="/rti/share" variant="outline">{t("rti.shareCta")}</Button></div>
          </div>
          <p className="text-xs text-ink-3">{draft.disclaimer}</p>
          <Button variant="outline" onClick={() => setStep(2)}>{t("common.back")}</Button>
        </div>
      )}
    </div>
  );
}

export default function NewRti() {
  return <Suspense><Drafter /></Suspense>;
}
