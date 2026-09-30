"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { KdMap } from "../map/kd-map";
import { useT } from "@/lib/i18n";

export function LiveMapCard({ center, zoom }: { center: [number, number]; zoom: number }) {
  const t = useT();
  return (
    <div className="relative h-[380px] overflow-hidden rounded-2xl border border-white/15 bg-navy-light shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:h-[440px]">
      <KdMap center={center} zoom={zoom} className="absolute inset-0" controls={false} scrollZoom={false} />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-navy shadow">
        <span className="size-2 animate-pulse-ring rounded-full bg-green" />{t("live.badge")}
      </div>
      <Link href="/explore" className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg bg-navy px-3 py-2 text-[13px] font-bold text-white shadow-lg hover:bg-navy-light">
        {t("hero.openMap")}<ArrowUpRight className="size-4" />
      </Link>
    </div>
  );
}
