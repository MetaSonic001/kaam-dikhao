"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "../ui";
import { useT } from "@/lib/i18n";

export function VoiceRecorder({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const t = useT();
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [on, setOn] = useState(false);
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState("");
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => { if (!on) return; const h = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(h); }, [on]);
  useEffect(() => { if (!file) { setUrl(null); return; } const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);

  const start = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((x) => x.stop());
        onChange(new File([new Blob(chunks.current, { type: mr.mimeType || "audio/webm" })], "voice.webm", { type: mr.mimeType || "audio/webm" }));
      };
      mr.start();
      rec.current = mr; setSecs(0); setOn(true);
    } catch { setErr(t("voice.denied")); }
  };
  const stop = () => { rec.current?.stop(); setOn(false); };

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        {!on && !file && <Button type="button" variant="outline" onClick={start}><Mic className="size-4" />{t("voice.start")}</Button>}
        {on && <><Button type="button" variant="danger" onClick={stop}><Square className="size-4" />{t("voice.stop")}</Button><span className="flex items-center gap-2 text-sm font-semibold text-red"><span className="size-2 animate-pulse rounded-full bg-red" />{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span></>}
        {file && !on && (
          <>
            {url && <audio src={url} controls className="h-10 flex-1" />}
            <button type="button" onClick={() => onChange(null)} aria-label={t("common.remove")} className="rounded-lg p-2 text-ink-3 hover:bg-surface-muted hover:text-red"><Trash2 className="size-4" /></button>
          </>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-3">{err || t("voice.hint")}</p>
    </div>
  );
}
