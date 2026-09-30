"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Sparkles, Square } from "lucide-react";
import { CategoryChip, StatusBadge } from "@/components/badges";
import { Button, Spinner, useToast } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Category, SiteStatus } from "@/lib/types";

type Answer = { answer: string; citations: { n: number; title: string; url: string }[]; sites: { slug: string; title: string; category: Category; status: SiteStatus; locality: string | null; city: string | null }[] };
type Msg = { role: "user"; text: string } | { role: "bot"; a: Answer };

export default function Ask() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  const ask = async (text: string) => {
    if (!text.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text }]); setQ(""); setBusy(true);
    try { const a = await api<Answer>("/api/assistant", { json: { question: text, lang, city: "mumbai" } }); setMsgs((m) => [...m, { role: "bot", a }]); }
    catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  };

  const mic = async () => {
    if (rec) { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream); const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((x) => x.stop()); setRec(null); setBusy(true);
        const fd = new FormData(); fd.set("audio", new File([new Blob(chunks, { type: mr.mimeType })], "q.webm")); fd.set("lang", lang);
        try { const r = await api<{ text: string }>("/api/transcribe", { form: fd }); setBusy(false); if (r.text.trim()) await ask(r.text); } catch (e) { setBusy(false); toast((e as Error).message, "error"); }
      };
      mr.start(); setRec(mr);
    } catch { toast(t("voice.denied"), "error"); }
  };

  const examples = [t("ask.ex1"), t("ask.ex2"), t("ask.ex3"), t("ask.ex4")];
  return (
    <div className="wrap flex max-w-3xl flex-col py-8" style={{ minHeight: "calc(100dvh - 4rem - 5rem)" }}>
      <div className="mb-5"><p className="kicker !text-orange-dark">{t("ask.kicker")}</p><h1 className="text-3xl font-extrabold tracking-tight text-navy">{t("ask.title")}</h1><p className="mt-1 text-ink-2">{t("ask.sub")}</p></div>

      <div className="flex-1 space-y-4">
        {msgs.length === 0 && <div className="grid gap-2 sm:grid-cols-2">{examples.map((e) => <button key={e} onClick={() => ask(e)} className="card flex items-start gap-2 p-4 text-left text-sm font-medium text-ink transition hover:shadow-[var(--shadow-float)]"><Sparkles className="mt-0.5 size-4 shrink-0 text-orange" />{e}</button>)}</div>}
        {msgs.map((m, i) => m.role === "user" ? (
          <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-navy px-4 py-2.5 text-[15px] text-white">{m.text}</div>
        ) : (
          <div key={i} className="max-w-[95%] space-y-3">
            <div className="card whitespace-pre-line p-4 text-[15px] leading-relaxed text-ink">{m.a.answer}</div>
            {m.a.sites.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{m.a.sites.map((s) => <Link key={s.slug} href={`/projects/${s.slug}`} className="card p-3 hover:shadow-[var(--shadow-float)]"><CategoryChip category={s.category} /><p className="mt-1 text-sm font-bold text-ink">{s.title}</p><div className="mt-1.5 flex items-center justify-between"><span className="text-xs text-ink-3">{s.locality}</span><StatusBadge status={s.status} /></div></Link>)}</div>}
            {m.a.citations.length > 0 && <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">{t("ask.sources")}: {m.a.citations.slice(0, 5).map((c) => <Link key={c.n} href={c.url} className="font-semibold text-blue hover:underline">[{c.n}] {c.title.slice(0, 40)}</Link>)}</p>}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-ink-2"><Spinner className="size-4" />{t("ask.thinking")}</div>}
        <div ref={end} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} className="sticky bottom-20 mt-4 md:bottom-4">
        <div className="card flex items-center gap-2 p-2 shadow-[var(--shadow-float)]">
          <button type="button" onClick={mic} aria-label={t("ask.mic")} className={`grid size-10 shrink-0 place-items-center rounded-lg ${rec ? "bg-red text-white" : "text-ink-2 hover:bg-surface-muted"}`}>{rec ? <Square className="size-4" /> : <Mic className="size-5" />}</button>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ask.placeholder")} aria-label={t("ask.placeholder")} maxLength={600} className="h-10 flex-1 bg-transparent px-1 text-[15px] outline-none placeholder:text-ink-3" />
          <Button type="submit" disabled={!q.trim() || busy}><Send className="size-4" /><span className="sr-only sm:not-sr-only">{t("ask.send")}</span></Button>
        </div>
        <p className="mt-2 text-center text-xs text-ink-3">{t("ask.disclaimer")}</p>
      </form>
    </div>
  );
}
