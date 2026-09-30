"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, LocateFixed, MapPin, PenLine, ShieldCheck, Sparkles, X } from "lucide-react";
import { PinPicker } from "./pin-picker";
import { VoiceRecorder } from "./voice-recorder";
import { AiBadge, CategoryChip, StatusBadge } from "../badges";
import { Badge, Button, Input, Label, Textarea, useToast } from "../ui";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtCoord, fmtDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/meta";
import { cn } from "@/lib/utils";
import type { Category, Observation, SiteStatus } from "@/lib/types";
import type { MsgKey } from "@/lib/messages";

type Candidate = { id: string; slug: string; title: string; category: Category; status: SiteStatus; locality: string | null; distance_m: number; match_pct: number; reasons: string[]; origin: string };
type Analysis = {
  draft_id: string; location: { lat: number; lng: number; source: string } | null; place: { locality?: string; ward?: string; city?: string; road?: string };
  captured_at: string | null; photos: { media_url: string; thumb_url: string; faces_blurred: number }[];
  transcript: { text: string; language?: string } | null; ai: { visible?: string[]; issues?: string[]; category?: string; observation?: Observation; confidence?: number } | null;
  note_public: string; flags: string[]; candidates: Candidate[]; suggested_new: { title: string; category: Category };
  privacy: { faces_blurred: number; plates_blurred: number; plate_check_ran: boolean };
};

const OBS: Observation[] = ["progress", "completed", "issue", "not_started"];

export function ReportWizard() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const { token, ready } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const camInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [audio, setAudio] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [category] = useState<Category | "">("");
  const [observation, setObservation] = useState<Observation>("issue");
  const [device, setDevice] = useState<{ lat: number; lng: number } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [an, setAn] = useState<Analysis | null>(null);
  const [pick, setPick] = useState<string | "new" | null>(null);
  const [newSite, setNewSite] = useState({ title: "", category: "road" as Category });
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [finalNote, setFinalNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState<{ site_slug: string; message: string } | null>(null);
  const [pre, setPre] = useState<{ id: string; title: string; slug: string; category: Category; status: SiteStatus } | null>(null);

  useEffect(() => { const u = photos.map((f) => URL.createObjectURL(f)); setPreviews(u); return () => u.forEach(URL.revokeObjectURL); }, [photos]);
  useEffect(() => {
    const id = sp.get("site");
    if (!id) return;
    api<{ site: { id: string; title: string; slug: string; category: Category; status: SiteStatus } }>(`/api/sites/${id}`).then((r) => { setPre(r.site); setPick(r.site.id); }).catch(() => {});
  }, [sp]);

  const locate = () => {
    setLocBusy(true);
    navigator.geolocation?.getCurrentPosition(
      (p) => { setDevice({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocBusy(false); },
      () => { setLocBusy(false); toast(t("rw.locDenied"), "info"); }, { enableHighAccuracy: true, timeout: 12000 });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (navigator.permissions) navigator.permissions.query({ name: "geolocation" }).then((r) => { if (r.state === "granted") locate(); }).catch(() => {}); }, []);

  const addFiles = (list: FileList | null) => { if (!list) return; setPhotos((p) => [...p, ...Array.from(list)].slice(0, 4)); };

  const analyze = async (coords?: { lat: number; lng: number }) => {
    setBusy(true);
    const fd = new FormData();
    photos.forEach((f) => fd.append("photos", f));
    if (audio) fd.set("audio", audio);
    fd.set("note", note); fd.set("lang", lang);
    const c = coords ?? device;
    if (c) { fd.set("lat", String(c.lat)); fd.set("lng", String(c.lng)); }
    if (category) fd.set("category", category);
    try {
      const r = await api<Analysis>("/api/reports/analyze", { token, form: fd });
      setAn(r);
      setFinalNote(r.note_public || "");
      if (r.ai?.observation && OBS.includes(r.ai.observation)) setObservation(r.ai.observation);
      setNewSite({ title: r.suggested_new.title, category: r.suggested_new.category });
      if (!pre) setPick(r.candidates[0] && r.candidates[0].match_pct >= 55 ? r.candidates[0].id : null);
      setStep(2);
    } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!an) return;
    setBusy(true);
    try {
      const r = await api<{ site_slug: string; message: string }>("/api/reports", { token, json: {
        draft_id: an.draft_id, site_id: pick && pick !== "new" ? pick : undefined, new_site: pick === "new" ? newSite : undefined,
        observation, category: category || an.ai?.category, note: finalNote, consent, lat: pin?.lat, lng: pin?.lng,
      } });
      setDone(r); setStep(4);
    } catch (e) { toast((e as Error).message, "error"); } finally { setBusy(false); }
  };

  if (!ready) return <div className="wrap py-16"><div className="skeleton mx-auto h-64 max-w-xl" /></div>;
  if (!token) {
    return (
      <div className="wrap py-16"><div className="card mx-auto max-w-lg p-8 text-center">
        <Camera className="mx-auto size-10 text-orange" />
        <h1 className="mt-3 text-2xl font-extrabold text-navy">{t("rw.signInTitle")}</h1>
        <p className="mt-2 text-ink-2">{t("rw.signInSub")}</p>
        <Button href="/login?next=/report" size="lg" className="mt-5">{t("nav.signIn")}</Button>
      </div></div>
    );
  }

  const canAnalyze = (photos.length > 0 || audio || note.trim().length > 3);
  const needPin = an && !an.location && !pin;
  const steps = [t("rw.s1"), t("rw.s2"), t("rw.s3")];

  return (
    <div className="wrap max-w-3xl py-8">
      {step < 4 && (
        <ol className="mb-6 flex items-center gap-2 text-sm" aria-label="Progress">
          {steps.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", step > i + 1 ? "bg-green text-white" : step === i + 1 ? "bg-orange text-white" : "bg-surface-muted text-ink-3")}>{step > i + 1 ? <Check className="size-4" /> : i + 1}</span>
              <span className={cn("hidden font-semibold sm:block", step === i + 1 ? "text-ink" : "text-ink-3")}>{s}</span>
              {i < 2 && <span className="h-px flex-1 bg-line" />}
            </li>
          ))}
        </ol>
      )}

      {/* ------------------------------------------------- step 1: add evidence */}
      {step === 1 && (
        <div className="space-y-6">
          <div><h1 className="text-3xl font-extrabold tracking-tight text-navy">{t("rw.title")}</h1><p className="mt-1 text-ink-2">{t("rw.sub")}</p></div>

          <div>
            <Label>{t("rw.photos")}</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {previews.map((p, i) => (
                <div key={p} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                  <img src={p} alt="" className="size-full object-cover" />
                  <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} aria-label={t("common.remove")} className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-navy/80 text-white"><X className="size-3.5" /></button>
                </div>
              ))}
              {photos.length < 4 && (
                <>
                  <button onClick={() => camInput.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-surface text-ink-2 transition hover:border-orange hover:text-orange-dark"><Camera className="size-6" /><span className="text-xs font-semibold">{t("rw.camera")}</span></button>
                  <button onClick={() => fileInput.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-surface text-ink-2 transition hover:border-orange hover:text-orange-dark"><ImagePlus className="size-6" /><span className="text-xs font-semibold">{t("rw.gallery")}</span></button>
                </>
              )}
            </div>
            <input ref={camInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-3"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-green" />{t("rw.privacy")}</p>
          </div>

          <div>
            <Label hint={t("common.optional")}>{t("rw.voice")}</Label>
            <VoiceRecorder file={audio} onChange={setAudio} />
          </div>

          <div>
            <Label hint={t("common.optional")}>{t("rw.note")}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1500} placeholder={t("rw.notePh")} />
          </div>

          <div>
            <Label>{t("rw.what")}</Label>
            <div className="flex flex-wrap gap-2">
              {OBS.map((o) => (
                <button key={o} onClick={() => setObservation(o)} aria-pressed={observation === o}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition", observation === o ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink-2 hover:bg-surface-muted")}>{t(`obs.${o}` as MsgKey)}</button>
              ))}
            </div>
          </div>

          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className={cn("grid size-10 place-items-center rounded-full", device ? "bg-green-soft text-green" : "bg-surface-muted text-ink-2")}><LocateFixed className="size-5" /></span>
              <div><p className="text-sm font-bold text-ink">{device ? t("rw.locOk") : t("rw.locTitle")}</p><p className="text-xs text-ink-3">{device ? fmtCoord(device.lat, device.lng) : t("rw.locSub")}</p></div>
            </div>
            {!device && <Button variant="outline" size="sm" loading={locBusy} onClick={locate}>{t("rw.useLoc")}</Button>}
          </div>

          <Button size="lg" className="w-full" disabled={!canAnalyze} loading={busy} onClick={() => analyze()}>
            {busy ? t("rw.analyzing") : t("rw.next")}
          </Button>
          {busy && <ul className="space-y-1.5 text-sm text-ink-2" aria-live="polite">{["rw.a1", "rw.a2", "rw.a3", "rw.a4"].map((k) => <li key={k} className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin text-orange" />{t(k as MsgKey)}</li>)}</ul>}
        </div>
      )}

      {/* -------------------------------------------------- step 2: confirm place */}
      {step === 2 && an && (
        <div className="space-y-5">
          <div><h1 className="text-2xl font-extrabold tracking-tight text-navy">{t("rw.matchTitle")}</h1><p className="mt-1 text-ink-2">{t("rw.matchSub")}</p></div>

          <div className="card p-4">
            <p className="kicker mb-2">{t("rw.detected")}</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2"><Check className="size-4 text-green" />{an.location ? `${t("rw.gps")}: ${fmtCoord(an.location.lat, an.location.lng)} (${t(`ev.loc.${an.location.source}` as MsgKey)})` : <span className="text-amber">{t("rw.noGps")}</span>}</li>
              {(an.place.locality || an.place.ward) && <li className="flex items-center gap-2"><Check className="size-4 text-green" />{[an.place.locality, an.place.ward, an.place.city].filter(Boolean).join(", ")}</li>}
              <li className="flex items-center gap-2"><Check className="size-4 text-green" />{an.captured_at ? `${t("rw.time")}: ${fmtDate(an.captured_at, lang)}` : <span className="text-ink-3">{t("rw.noTime")}</span>}</li>
              {an.privacy.faces_blurred > 0 && <li className="flex items-center gap-2"><Check className="size-4 text-green" />{t("rw.faces", { n: an.privacy.faces_blurred })}</li>}
              {an.privacy.plates_blurred > 0 && <li className="flex items-center gap-2"><Check className="size-4 text-green" />{t("rw.plates", { n: an.privacy.plates_blurred })}</li>}
            </ul>
            {an.flags.some((f) => f.startsWith("photo_") || f === "outside_supported_cities") && (
              <div className="mt-3 rounded-lg bg-amber-soft p-3 text-[13px] text-amber">{an.flags.filter((f) => f.startsWith("photo_") || f === "outside_supported_cities").map((f) => <p key={f}>• {t(`flag.${f}` as MsgKey)}</p>)}</div>
            )}
          </div>

          {!an.location && (
            <div className="card p-4">
              <p className="mb-2 text-sm font-bold text-ink">{t("rw.pinTitle")}</p>
              <PinPicker center={device ? [device.lat, device.lng] : [19.076, 72.8777]} onPick={setPin} className="h-64 overflow-hidden rounded-xl" />
              <Button className="mt-3" disabled={!pin} loading={busy} onClick={() => pin && analyze(pin)}>{t("rw.pinConfirm")}</Button>
            </div>
          )}

          {an.location && (
            <>
              {an.ai && (
                <div className="card p-4">
                  <div className="flex flex-wrap items-center gap-2"><AiBadge /><span className="text-xs text-ink-3">{t("rw.aiCheck")}</span></div>
                  {an.ai.visible && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-2">{an.ai.visible.map((v) => <li key={v}>{v}</li>)}</ul>}
                  {an.transcript?.text && <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm text-ink"><Sparkles className="mr-1 inline size-3.5 text-orange" />{t("rw.heard")}: “{an.transcript.text}”</p>}
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-bold text-ink">{t("rw.pickTitle")}</p>
                <div className="space-y-2">
                  {pre && !an.candidates.some((c) => c.id === pre.id) && (
                    <Choice on={pick === pre.id} onClick={() => setPick(pre.id)}>
                      <div className="flex items-center justify-between gap-2"><span className="font-bold text-ink">{pre.title}</span><StatusBadge status={pre.status} /></div>
                      <p className="text-xs text-ink-3">{t("rw.preselected")}</p>
                    </Choice>
                  )}
                  {an.candidates.map((c) => (
                    <Choice key={c.id} on={pick === c.id} onClick={() => setPick(c.id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><CategoryChip category={c.category} /><p className="font-bold text-ink">{c.title}</p><p className="text-xs text-ink-3">{c.locality} · {c.reasons.join(" · ")}</p></div>
                        <div className="shrink-0 text-right"><p className="text-xl font-extrabold text-navy">{c.match_pct}%</p><p className="text-[11px] text-ink-3">{t("rw.match")}</p></div>
                      </div>
                    </Choice>
                  ))}
                  <Choice on={pick === "new"} onClick={() => setPick("new")}>
                    <p className="flex items-center gap-2 font-bold text-ink"><MapPin className="size-4 text-orange" />{an.candidates.length ? t("rw.noneOfThese") : t("rw.noneNearby")}</p>
                    <p className="text-xs text-ink-3">{t("rw.newSub")}</p>
                    {pick === "new" && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2" onClick={(e) => e.stopPropagation()}>
                        <div><Label>{t("rw.newName")}</Label><Input value={newSite.title} onChange={(e) => setNewSite({ ...newSite, title: e.target.value })} maxLength={120} /></div>
                        <div><Label>{t("filter.type")}</Label><select value={newSite.category} onChange={(e) => setNewSite({ ...newSite, category: e.target.value as Category })} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm">{CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c}` as MsgKey)}</option>)}</select></div>
                      </div>
                    )}
                  </Choice>
                </div>
              </div>
            </>
          )}
          <div className="flex gap-3"><Button variant="outline" onClick={() => setStep(1)}>{t("common.back")}</Button><Button className="flex-1" disabled={!pick || needPin || (pick === "new" && newSite.title.trim().length < 3)} onClick={() => setStep(3)}>{t("common.continue")}</Button></div>
        </div>
      )}

      {/* ------------------------------------------------ step 3: review & send */}
      {step === 3 && an && (
        <div className="space-y-5">
          <div><h1 className="text-2xl font-extrabold tracking-tight text-navy">{t("rw.reviewTitle")}</h1><p className="mt-1 text-ink-2">{t("rw.reviewSub")}</p></div>
          {an.photos.length > 0 && <div className="flex gap-2 overflow-x-auto">{an.photos.map((p) => <img key={p.thumb_url} src={mediaUrl(p.thumb_url)} alt="" className="size-28 rounded-xl object-cover" />)}</div>}
          <div>
            <Label hint={t("rw.neutralHint")}><PenLine className="mr-1 inline size-3.5" />{t("rw.publicNote")}</Label>
            <Textarea value={finalNote} onChange={(e) => setFinalNote(e.target.value)} maxLength={1500} placeholder={t("rw.notePh")} />
            {an.flags.some((f) => f.startsWith("rewritten") || f.startsWith("accusatory") || f.startsWith("pii")) && <p className="mt-1.5 text-xs text-amber">{t("rw.rewritten")}</p>}
          </div>
          <div>
            <Label>{t("rw.what")}</Label>
            <div className="flex flex-wrap gap-2">
              {OBS.map((o) => <button key={o} onClick={() => setObservation(o)} aria-pressed={observation === o} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold", observation === o ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink-2")}>{t(`obs.${o}` as MsgKey)}</button>)}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface-muted/60 p-4 text-[13px] leading-relaxed text-ink-2">
            <p className="mb-1 font-bold text-ink">{t("rw.beforeSubmit")}</p>
            <ul className="list-disc space-y-1 pl-4"><li>{t("rw.p1")}</li><li>{t("rw.p2")}</li><li>{t("rw.p3")}</li></ul>
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-orange" />{t("rw.consent")} <Link href="/legal#privacy" className="font-semibold text-blue underline">{t("footer.privacy")}</Link></label>
          <div className="flex gap-3"><Button variant="outline" onClick={() => setStep(2)}>{t("common.back")}</Button><Button className="flex-1" size="lg" disabled={!consent} loading={busy} onClick={submit}>{t("rw.submit")}</Button></div>
        </div>
      )}

      {/* ------------------------------------------------------------ step 4 */}
      {step === 4 && done && (
        <div className="card p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-green-soft text-green"><Check className="size-8" /></span>
          <h1 className="mt-4 text-2xl font-extrabold text-navy">{t("rw.doneTitle")}</h1>
          <p className="mx-auto mt-2 max-w-md text-ink-2">{done.message}</p>
          <ol className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm">
            {(["rw.st1", "rw.st2", "rw.st3", "rw.st4"] as MsgKey[]).map((k, i) => (
              <li key={k} className="flex items-center gap-3"><span className={cn("grid size-6 place-items-center rounded-full text-xs font-bold", i < 2 ? "bg-green text-white" : "bg-surface-muted text-ink-3")}>{i < 2 ? <Check className="size-3.5" /> : i + 1}</span><span className={i < 2 ? "font-semibold text-ink" : "text-ink-3"}>{t(k)}</span>{i === 2 && <Badge tone="blue">{t("rw.now")}</Badge>}</li>
            ))}
          </ol>
          <div className="mt-7 flex flex-wrap justify-center gap-3"><Button href={`/projects/${done.site_slug}`}>{t("rw.viewProject")}</Button><Button variant="outline" onClick={() => router.push("/dashboard")}>{t("rw.myReports")}</Button></div>
        </div>
      )}
    </div>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div role="radio" aria-checked={on} tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className={cn("cursor-pointer rounded-xl border-2 bg-surface p-3.5 transition", on ? "border-orange bg-orange-soft/40" : "border-line hover:border-ink-3")}>{children}</div>
  );
}
