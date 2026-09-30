import Link from "next/link";
import { Logo } from "./logo";
import { getT } from "@/lib/i18n-server";

export async function Footer() {
  const { t } = await getT();
  const cols = [
    { h: t("footer.explore"), l: [["/explore", t("nav.explore")], ["/projects", t("nav.projects")], ["/report-cards", t("nav.reportCards")], ["/rti", t("nav.rti")], ["/civic-watch", t("nav.civicWatch")]] },
    { h: t("footer.participate"), l: [["/report", t("nav.report")], ["/rti/new", t("footer.fileRti")], ["/ask", t("nav.ask")], ["/login", t("nav.signIn")]] },
    { h: t("footer.learn"), l: [["/methodology", t("nav.methodology")], ["/transparency", t("nav.transparency")], ["/about", t("nav.about")]] },
    { h: t("footer.legal"), l: [["/legal#terms", t("footer.terms")], ["/legal#privacy", t("footer.privacy")], ["/legal#guidelines", t("footer.guidelines")], ["/legal#grievance", t("footer.grievance")]] },
  ];
  return (
    <footer className="mt-20 bg-navy text-white/80 pb-24 md:pb-0">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo light />
          <p className="mt-3 text-lg font-semibold text-white">{t("brand.tagline")}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/60">{t("footer.blurb")}</p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <p className="kicker !text-white/50">{c.h}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {c.l.map(([href, label]) => (
                <li key={href}><Link href={href} className="hover:text-orange">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col gap-2 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.data")}</p>
          <p>{t("footer.built")} · #KaamDikhao</p>
        </div>
      </div>
    </footer>
  );
}
