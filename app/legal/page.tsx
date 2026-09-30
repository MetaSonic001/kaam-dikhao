import type { Metadata } from "next";
import { Suspense } from "react";
import { GrievanceForm } from "@/components/grievance-form";
import { LEGAL } from "@/lib/content";
import { getLang } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Terms, privacy and grievances", description: "Terms of use, community guidelines, privacy under the DPDP Act 2023, and the grievance officer contact." };

const OFFICER = process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL ?? "grievance@kaamdikhao.in";

export default async function Legal() {
  const lang = await getLang();
  const l = LEGAL[lang];
  return (
    <div className="wrap grid gap-10 py-10 lg:grid-cols-[220px_1fr]">
      <nav aria-label="On this page" className="hidden lg:block"><ul className="sticky top-24 space-y-1 border-l border-line text-sm">{l.sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent px-4 py-1.5 text-ink-2 hover:border-orange hover:text-ink">{s.title}</a></li>)}</ul></nav>
      <article className="max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{l.title}</h1>
        <p className="mt-3 text-lg text-ink-2">{l.intro}</p>
        {l.sections.map((s) => (
          <section key={s.id} id={s.id} className="mt-10 scroll-mt-24 border-t border-line pt-8">
            <h2 className="text-xl font-bold text-ink">{s.title}</h2>
            {s.body.map((p) => <p key={p} className="mt-3 leading-relaxed text-ink-2">{p}</p>)}
            {s.id === "grievance" && <div className="mt-5"><Suspense><GrievanceForm email={OFFICER} /></Suspense></div>}
          </section>
        ))}
      </article>
    </div>
  );
}
