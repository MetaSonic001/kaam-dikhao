import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
import { EmptyState, SectionTitle } from "@/components/ui";
import { apiSafe, qs } from "@/lib/api";
import { fmtNum } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import { CITY_LIST } from "@/lib/meta";

export const metadata: Metadata = { title: "Civic Watch", description: "Patterns worth a closer look in public works data, each linked to the underlying records." };
export const dynamic = "force-dynamic";

type Watch = { items: { key: string; title: string; detail: string; count: number; params: Record<string, string> }[] };

export default async function CivicWatch({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const { city = "mumbai" } = await searchParams;
  const { t, lang } = await getT();
  const w = await apiSafe<Watch>(`/api/civic-watch${qs({ city })}`);
  return (
    <div className="wrap py-8">
      <SectionTitle kicker={t("nav.civicWatch")} title={t("cw.title")} sub={t("cw.sub")} />
      <div className="mb-6 flex flex-wrap gap-2">
        {CITY_LIST.map((c) => <Link key={c} href={`/civic-watch?city=${c}`} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${c === city ? "border-navy bg-navy text-white" : "border-line bg-surface text-ink-2 hover:bg-surface-muted"}`}>{c[0].toUpperCase() + c.slice(1)}</Link>)}
      </div>
      {!w || w.items.length === 0 ? <EmptyState icon={<Eye className="size-6" />} title={t("cw.empty")} text={t("cw.emptySub")} /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {w.items.map((i) => (
            <Link key={i.key} href={`/projects${qs({ city, ...i.params })}`} className="card group flex gap-5 p-6 transition hover:shadow-[var(--shadow-float)]">
              <p className="text-5xl font-black tracking-tight text-navy">{fmtNum(i.count, lang)}</p>
              <div><h2 className="text-[17px] font-bold leading-snug text-ink">{t(`cw.k.${i.key}` as never)}</h2><p className="mt-1.5 text-sm text-ink-2">{t(`cw.d.${i.key}` as never)}</p><p className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-orange-dark">{t("cw.inspect")}<ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></p></div>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-8 max-w-2xl text-sm text-ink-3">{t("cw.note")}</p>
    </div>
  );
}
