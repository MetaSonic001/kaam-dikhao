"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Landmark, MapPin, Search } from "lucide-react";
import { Modal, Spinner } from "./ui";
import { StatusBadge } from "./badges";
import { api, qs } from "@/lib/api";
import { useT } from "@/lib/i18n";
import type { SiteStatus } from "@/lib/types";

type Res = {
  sites: { slug: string; title: string; status: SiteStatus; locality: string | null; city: string | null }[];
  areas: { name: string; city: string; n: number }[];
  rtis: { id: string; subject: string; authority: string }[];
  places: { name: string; lat: number; lng: number }[];
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 50); }, [open]);
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    setBusy(true);
    const ctl = new AbortController();
    const h = setTimeout(async () => {
      try { setRes(await api<Res>(`/api/search${qs({ q })}`, { signal: ctl.signal })); } catch { /* aborted */ } finally { setBusy(false); }
    }, 220);
    return () => { clearTimeout(h); ctl.abort(); };
  }, [q]);

  const go = (href: string) => { onClose(); setQ(""); router.push(href); };
  const empty = useMemo(() => res && !res.sites.length && !res.areas.length && !res.rtis.length && !res.places.length, [res]);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="-mt-6">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Search className="size-5 text-ink-3" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search.placeholder")}
            className="h-9 flex-1 bg-transparent text-base outline-none placeholder:text-ink-3" aria-label={t("nav.search")}
            onKeyDown={(e) => { if (e.key === "Enter" && q.trim().length > 1) go(`/projects?q=${encodeURIComponent(q)}`); }} />
          {busy && <Spinner className="size-4" />}
        </div>
        <div className="mt-3 max-h-[52vh] space-y-4 overflow-y-auto">
          {!res && !busy && <p className="py-6 text-center text-sm text-ink-3">{t("search.hint")}</p>}
          {empty && <p className="py-6 text-center text-sm text-ink-2">{t("search.none")}</p>}
          {res && res.sites.length > 0 && (
            <Group title={t("search.projects")}>
              {res.sites.map((s) => (
                <Row key={s.slug} onClick={() => go(`/projects/${s.slug}`)} icon={<Landmark className="size-4" />}
                  title={s.title} sub={[s.locality, s.city].filter(Boolean).join(", ")} right={<StatusBadge status={s.status} />} />
              ))}
            </Group>
          )}
          {res && res.areas.length > 0 && (
            <Group title={t("search.areas")}>
              {res.areas.map((a) => (
                <Row key={a.name + a.city} onClick={() => go(`/projects?q=${encodeURIComponent(a.name)}`)} icon={<MapPin className="size-4" />} title={a.name} sub={`${a.city} · ${a.n}`} />
              ))}
            </Group>
          )}
          {res && res.places.length > 0 && (
            <Group title={t("search.places")}>
              {res.places.map((p) => (
                <Row key={p.name} onClick={() => go(`/explore?lat=${p.lat}&lng=${p.lng}&z=14`)} icon={<MapPin className="size-4" />} title={p.name.split(",").slice(0, 2).join(",")} sub={p.name.split(",").slice(2, 5).join(",")} />
              ))}
            </Group>
          )}
          {res && res.rtis.length > 0 && (
            <Group title={t("search.rtis")}>
              {res.rtis.map((r) => <Row key={r.id} onClick={() => go(`/rti/${r.id}`)} icon={<FileText className="size-4" />} title={r.subject} sub={r.authority} />)}
            </Group>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="kicker mb-1.5">{title}</p><div className="space-y-0.5">{children}</div></div>;
}
function Row({ icon, title, sub, right, onClick }: { icon: React.ReactNode; title: string; sub?: string; right?: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-surface-muted">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-muted text-ink-2">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{title}</span>{sub && <span className="block truncate text-xs text-ink-3">{sub}</span>}</span>
      {right}
    </button>
  );
}
