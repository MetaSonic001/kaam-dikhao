import type { Metadata } from "next";
import { ABOUT } from "@/lib/content";
import { getT } from "@/lib/i18n-server";
import { Button } from "@/components/ui";

export const metadata: Metadata = { title: "About", description: "Kaam Dikhao is a neutral public evidence layer for public works in India." };

export default async function About() {
  const { t, lang } = await getT();
  const a = ABOUT[lang];
  return (
    <div className="wrap max-w-4xl py-12">
      <p className="kicker !text-orange-dark">{t("nav.about")}</p>
      <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight text-navy sm:text-5xl">{a.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-2">{a.lead}</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {a.principles.map((p, i) => <div key={p.t} className="card p-5"><p className="text-3xl font-black text-surface-muted">{i + 1}</p><h2 className="font-bold text-ink">{p.t}</h2><p className="mt-1 text-sm text-ink-2">{p.d}</p></div>)}
      </div>
      <div className="mt-10 flex flex-wrap gap-3"><Button href="/explore">{t("hero.cta1")}</Button><Button href="/methodology" variant="outline">{t("nav.methodology")}</Button><Button href="/transparency" variant="outline">{t("nav.transparency")}</Button></div>
    </div>
  );
}
