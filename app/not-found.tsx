import { Button } from "@/components/ui";
import { getT } from "@/lib/i18n-server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="wrap grid min-h-[60vh] place-items-center py-16 text-center">
      <div>
        <p className="text-7xl font-black text-surface-muted">404</p>
        <h1 className="mt-2 text-2xl font-extrabold text-navy">{t("nf.title")}</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-2">{t("nf.sub")}</p>
        <div className="mt-6 flex justify-center gap-3"><Button href="/projects">{t("nav.projects")}</Button><Button href="/" variant="outline">{t("mnav.home")}</Button></div>
      </div>
    </div>
  );
}
