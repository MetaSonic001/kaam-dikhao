"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Health } from "@/lib/types";
import type { MsgKey } from "@/lib/messages";

const COLOR = { good: "#16805a", mixed: "#b47b0a", attention: "#c93c3c", insufficient: "#7c8890" };

export function HealthGauge({ health }: { health: Health }) {
  const { t } = useI18n();
  const score = health.score;
  const r = 54, c = 2 * Math.PI * r;
  const col = COLOR[health.label];
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-ink">{t("health.title")}</h3>
        <Link href="/methodology#score" className="inline-flex items-center gap-1 text-xs font-semibold text-blue hover:underline"><Info className="size-3.5" />{t("health.method")}</Link>
      </div>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative size-[132px] shrink-0">
          <svg viewBox="0 0 132 132" className="size-full -rotate-90" role="img" aria-label={score === null ? t("health.none") : `${score} / 100`}>
            <circle cx="66" cy="66" r={r} fill="none" stroke="var(--surface-muted)" strokeWidth="12" />
            {score !== null && <circle cx="66" cy="66" r={r} fill="none" stroke={col} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: "stroke-dashoffset .8s ease" }} />}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-3xl font-extrabold leading-none text-ink">{score ?? "—"}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-ink-3">/ 100</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-lg font-bold" style={{ color: col }}>{t(`health.${health.label}` as MsgKey)}</p>
          <p className="mt-1 text-[13px] leading-snug text-ink-2">{score === null ? t("health.noneSub") : t("health.coverage", { n: health.coverage })}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-3">
        {(Object.entries(health.components) as [keyof Health["components"], Health["components"][keyof Health["components"]]][]).map(([k, v]) => (
          <li key={k}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-ink">{t(`health.c.${k}` as MsgKey)} <span className="font-normal text-ink-3">· {v.weight ? `${v.weight}%` : t("health.infoOnly")}</span></span>
              <span className="font-bold text-ink">{v.value ?? "—"}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full" style={{ width: `${v.value ?? 0}%`, background: v.value === null ? "transparent" : v.weight ? col : "var(--text-muted)" }} /></div>
            <p className="mt-1 text-xs text-ink-3">{v.note}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-3">{health.disclaimer}</p>
    </div>
  );
}
