import type { Metadata } from "next";
import { METHODOLOGY } from "@/lib/content";
import { getLang } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Methodology", description: "How data is sourced, what Verified means, how satellite evidence and scores work, and what AI does and does not do." };

export default async function Methodology() {
  const lang = await getLang();
  const m = METHODOLOGY[lang];
  return (
    <div className="wrap grid gap-10 py-10 lg:grid-cols-[220px_1fr]">
      <nav aria-label="On this page" className="hidden lg:block"><ul className="sticky top-24 space-y-1 border-l border-line text-sm">{m.sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent px-4 py-1.5 text-ink-2 hover:border-orange hover:text-ink">{s.title}</a></li>)}</ul></nav>
      <article className="max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{m.title}</h1>
        <p className="mt-3 text-lg text-ink-2">{m.intro}</p>
        {m.sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-line pt-8 mt-10">
            <h2 className="text-xl font-bold text-ink">{s.title}</h2>
            {s.body.map((p) => <p key={p} className="mt-3 leading-relaxed text-ink-2">{p}</p>)}
          </section>
        ))}
      </article>
    </div>
  );
}
