"use client";

import { Building2, Camera, FileText, Flag, MessageSquare, Radio, Satellite, Target } from "lucide-react";
import { useState, type ReactNode } from "react";
import { fmtDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/types";

const ICON: Record<string, { i: ReactNode; c: string }> = {
  official: { i: <Building2 className="size-4" />, c: "bg-green-soft text-green" },
  milestone: { i: <Target className="size-4" />, c: "bg-orange-soft text-orange-dark" },
  evidence: { i: <Camera className="size-4" />, c: "bg-blue-soft text-blue" },
  satellite: { i: <Satellite className="size-4" />, c: "bg-navy text-white" },
  rti: { i: <FileText className="size-4" />, c: "bg-amber-soft text-amber" },
  reply: { i: <MessageSquare className="size-4" />, c: "bg-surface-muted text-ink-2" },
  source: { i: <Radio className="size-4" />, c: "bg-blue-soft text-blue" },
  system: { i: <Flag className="size-4" />, c: "bg-surface-muted text-ink-2" },
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const { t, lang } = useI18n();
  const [now] = useState(() => Date.now());
  const past = events.filter((e) => new Date(e.at).getTime() <= now);
  const future = events.filter((e) => new Date(e.at).getTime() > now);
  const ordered = [...future.reverse(), ...past.reverse()]; // upcoming on top, then newest first
  return (
    <ol className="relative space-y-5 border-l-2 border-line pl-6">
      {ordered.map((e, i) => {
        const m = ICON[e.kind] ?? ICON.system;
        const up = new Date(e.at).getTime() > now;
        return (
          <li key={i} className="relative">
            <span className={cn("absolute -left-[37px] grid size-7 place-items-center rounded-full ring-4 ring-background", m.c)}>{m.i}</span>
            <p className="text-xs font-semibold text-ink-3">{fmtDate(e.at, lang)}{up && ` · ${t("tl.upcoming")}`}</p>
            <p className="text-[15px] font-bold text-ink">{e.title}</p>
            {e.detail && <p className="text-[13px] text-ink-2">{e.detail}</p>}
            {e.source && (
              <p className="mt-0.5 text-xs text-ink-3">
                {t("tl.source")}: {e.url ? <a className="font-semibold text-blue hover:underline" href={e.url} target={e.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{e.source}</a> : e.source}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
