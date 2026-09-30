"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FilePlus2, Search, Share2 } from "lucide-react";
import { RtiCard } from "@/components/rti/cards";
import { Button, EmptyState, ErrorState, Select, Skeleton } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { fmtNum } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { RtiItem } from "@/lib/types";

export default function RtiRegistry() {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState("");
  const [data, setData] = useState<{ total: number; items: RtiItem[] } | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    setData(null); setErr(false);
    const h = setTimeout(() => api<{ total: number; items: RtiItem[] }>(`/api/rti${qs({ q, outcome })}`).then(setData).catch(() => setErr(true)), 250);
    return () => clearTimeout(h);
  }, [q, outcome]);

  return (
    <div className="wrap py-8">
      <div className="rounded-2xl bg-navy p-6 text-white sm:p-10">
        <p className="kicker !text-orange">{t("nav.rti")}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">{t("rti.title")}</h1>
        <p className="mt-3 max-w-2xl text-white/75">{t("rti.sub")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/rti/new" size="lg"><FilePlus2 className="size-4" />{t("rti.draftCta")}</Button>
          <Button href="/rti/share" size="lg" variant="outline" className="!border-white/30 !bg-transparent !text-white hover:!bg-white/10"><Share2 className="size-4" />{t("rti.shareCta")}</Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="card flex flex-1 items-center gap-2 px-3"><Search className="size-5 text-ink-3" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("rti.search")} aria-label={t("rti.search")} className="h-12 w-full bg-transparent outline-none placeholder:text-ink-3" /></label>
        <Select className="!h-12 sm:!w-52" value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label={t("rti.outcome")}>
          <option value="">{t("rti.allOutcomes")}</option>
          {["FULL", "PARTIAL", "REJECTED", "TRANSFERRED", "NO_RESPONSE", "PENDING"].map((o) => <option key={o} value={o}>{t(`rti.o.${o}` as never)}</option>)}
        </Select>
      </div>

      <div className="mt-6">
        {err ? <ErrorState title={t("error.rti")} text={t("error.tryLater")} /> :
          !data ? <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36" />)}</div> :
          data.items.length === 0 ? (
            <EmptyState icon={<FilePlus2 className="size-6" />} title={q || outcome ? t("empty.rti") : t("rti.emptyTitle")} text={q || outcome ? t("empty.rtiSub") : t("rti.emptySub")}
              action={<div className="flex flex-wrap justify-center gap-2"><Button href="/rti/new">{t("rti.draftCta")}</Button><Button variant="outline" href="/rti/share">{t("rti.shareCta")}</Button></div>} />
          ) : (
            <>
              <p className="mb-3 text-sm font-semibold text-ink-2">{t("rti.found", { n: fmtNum(data.total, lang) })}</p>
              <div className="grid gap-4 md:grid-cols-2">{data.items.map((r) => <RtiCard key={r.id} r={r} />)}</div>
            </>
          )}
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((n) => <div key={n} className="card p-5"><p className="text-3xl font-black text-surface-muted">{n}</p><h3 className="font-bold text-ink">{t(`rti.how${n}.t` as never)}</h3><p className="mt-1 text-[13px] text-ink-2">{t(`rti.how${n}.d` as never)}</p></div>)}
      </div>
      <p className="mt-6 text-xs text-ink-3">{t("rti.disclaimer")} <Link href="/methodology" className="font-semibold text-blue hover:underline">{t("nav.methodology")}</Link></p>
    </div>
  );
}
