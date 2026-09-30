import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, ExternalLink, FileSearch, FileText, Megaphone, MapPin, ShieldQuestion } from "lucide-react";
import { ClaimVsReality } from "@/components/project/claim-vs-reality";
import { EvidenceGallery } from "@/components/project/evidence";
import { FollowButton, ShareButton } from "@/components/project/actions";
import { DocumentForm, ReplyForm } from "@/components/project/forms";
import { HealthGauge } from "@/components/project/health";
import { SatelliteViewer } from "@/components/project/satellite-viewer";
import { Timeline } from "@/components/project/timeline";
import { MiniMap } from "@/components/map/mini-map";
import { CategoryChip, OriginBadge, StatusBadge } from "@/components/badges";
import { Badge, Button, EmptyState } from "@/components/ui";
import { apiSafe } from "@/lib/api";
import { fmtCoord, fmtDate, fmtDistance, fmtInr, timeAgo } from "@/lib/format";
import { getT } from "@/lib/i18n-server";
import type { MsgKey } from "@/lib/messages";
import type { SiteDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await apiSafe<SiteDetail>(`/api/sites/${slug}`);
  if (!d) return { title: "Project not found" };
  const s = d.site;
  const title = `${s.title}${s.locality ? ` — ${s.locality}` : ""}${s.city ? `, ${s.city}` : ""}`;
  return {
    title, description: `${s.claim_text ?? ""} Status: ${s.status.toLowerCase().replace("_", " ")}. See sources, citizen evidence and satellite history on Kaam Dikhao.`.trim(),
    alternates: { canonical: `/projects/${s.slug}` }, openGraph: { title, type: "article" },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await apiSafe<SiteDetail>(`/api/sites/${slug}`);
  if (!d) notFound();
  const { t, lang } = await getT();
  const s = d.site;
  const where = [s.locality, s.ward, s.city, s.state].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" · ");
  const ld = { "@context": "https://schema.org", "@type": "Place", name: s.title, geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng }, address: { "@type": "PostalAddress", addressLocality: s.city, addressRegion: s.state, addressCountry: "IN" } };

  const nav: [string, MsgKey][] = [["overview", "pd.overview"], ["evidence", "pd.evidence"], ["satellite", "pd.satellite"], ["timeline", "pd.timeline"], ["records", "pd.records"], ["reply", "pd.reply"]];

  return (
    <div className="pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {/* ----------------------------------------------------------- header */}
      <div className="border-b border-line bg-surface">
        <div className="wrap py-6">
          <nav className="mb-3 text-[13px] text-ink-3" aria-label="Breadcrumb"><Link href="/projects" className="hover:text-ink">{t("nav.projects")}</Link> / {s.city && <Link href={`/projects?city=${s.city.toLowerCase()}`} className="hover:text-ink">{s.city}</Link>}</nav>
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={s.status} /><OriginBadge origin={s.origin} /><CategoryChip category={s.category} /></div>
          <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-navy sm:text-4xl">{s.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-[15px] text-ink-2"><MapPin className="size-4 text-ink-3" />{where || t("card.locating")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button href={`/report?site=${s.id}`}><Camera className="size-4" />{t("pd.addEvidence")}</Button>
            <FollowButton siteId={s.id} initial={d.following} />
            <ShareButton title={s.title} status={t(`status.${s.status}` as MsgKey)} path={`/projects/${s.slug}`} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
            <Stat k={t("card.sanctioned")} v={s.sanctioned_amount ? fmtInr(s.sanctioned_amount, lang) : t("card.notPublished")} muted={!s.sanctioned_amount} />
            <Stat k={t("cvr.contractor")} v={s.contractor ?? t("card.notPublished")} muted={!s.contractor} />
            <Stat k={t("card.expected")} v={s.expected_completion ? fmtDate(s.expected_completion, lang) : t("card.notPublished")} muted={!s.expected_completion} />
            <Stat k={t("pd.lastCheck")} v={s.last_synced_at ? timeAgo(s.last_synced_at, lang) : "—"} />
          </div>
        </div>
        <div className="wrap hidden lg:block">
          <nav className="flex gap-1" aria-label="Sections">{nav.map(([id, k]) => <a key={id} href={`#${id}`} className="rounded-t-lg px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-surface-muted hover:text-ink">{t(k)}</a>)}</nav>
        </div>
      </div>

      <div className="wrap mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-12">
          <section id="overview" className="scroll-mt-24">
            <h2 className="mb-4 text-xl font-bold text-ink">{t("pd.claimVsReality")}</h2>
            <ClaimVsReality d={d} />
          </section>

          <section aria-label={t("pd.map")}>
            <MiniMap lat={s.lat} lng={s.lng} geometry={s.geometry} status={s.status} pins={d.reports.filter((r) => r.lat != null).map((r) => ({ lat: r.lat!, lng: r.lng!, label: r.note_public ?? "" }))} className="h-72 sm:h-80" />
            <p className="mt-2 text-xs text-ink-3">{fmtCoord(s.lat, s.lng)}{s.pincode ? ` · ${s.pincode}` : ""} · {t("pd.mapNote")}</p>
          </section>

          <section id="evidence" className="scroll-mt-24">
            <h2 className="mb-1 text-xl font-bold text-ink">{t("pd.evidence")}</h2>
            <p className="mb-4 text-sm text-ink-2">{t("pd.evidenceSub")}</p>
            <EvidenceGallery reports={d.reports} pending={d.pending_reports} mine={d.my_reports} siteId={s.id} />
          </section>

          <section id="satellite" className="scroll-mt-24">
            <h2 className="mb-1 text-xl font-bold text-ink">{t("pd.satellite")}</h2>
            <p className="mb-4 text-sm text-ink-2">{t("pd.satelliteSub")}</p>
            <SatelliteViewer siteId={s.id} initial={d.satellite} />
          </section>

          <section id="timeline" className="scroll-mt-24">
            <h2 className="mb-4 text-xl font-bold text-ink">{t("pd.timeline")}</h2>
            <Timeline events={d.events} />
          </section>

          <section id="records" className="scroll-mt-24">
            <h2 className="mb-1 text-xl font-bold text-ink">{t("pd.records")}</h2>
            <p className="mb-4 text-sm text-ink-2">{t("pd.recordsSub")}</p>

            {/* source chain: where did this number come from? */}
            <ol className="mb-5 grid gap-2 text-[13px] sm:grid-cols-4" aria-label={t("pd.chain")}>
              {(["chain.1", "chain.2", "chain.3", "chain.4"] as MsgKey[]).map((k, i) => (
                <li key={k} className="card flex items-center gap-2 p-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-bold text-white">{i + 1}</span>{t(k)}</li>
              ))}
            </ol>

            {d.documents.length > 0 ? (
              <ul className="mb-4 space-y-2">
                {d.documents.map((doc) => (
                  <li key={doc.id} className="card flex items-center gap-3 p-3">
                    <FileText className="size-5 text-orange-dark" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{doc.title ?? t(`doc.k.${doc.kind}` as MsgKey)}</p><p className="text-xs text-ink-3">{fmtDate(doc.created_at, lang)}</p></div>
                    {(doc.file_url ?? doc.source_url) && <a className="text-sm font-semibold text-blue hover:underline" href={doc.file_url ?? doc.source_url!} target="_blank" rel="noopener noreferrer">{t("common.open")}</a>}
                  </li>
                ))}
              </ul>
            ) : <div className="mb-4"><EmptyState icon={<FileText className="size-6" />} title={t("pd.noDocs")} text={t("pd.noDocsSub")} /></div>}

            <div className="flex flex-wrap gap-2">
              <DocumentForm siteId={s.id} />
              <Button href={`/rti/new?site=${s.id}`} variant="soft"><FileSearch className="size-4" />{t("pd.askRecords")}</Button>
            </div>

            {d.rtis.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-base font-bold text-ink">{t("pd.linkedRti")}</h3>
                <ul className="space-y-2">
                  {d.rtis.map((r) => (
                    <li key={r.id}><Link href={`/rti/${r.id}`} className="card flex items-center justify-between gap-3 p-3 hover:shadow-[var(--shadow-float)]"><span className="text-sm font-semibold text-ink">{r.subject}</span><Badge tone={r.outcome === "FULL" ? "green" : r.outcome === "PENDING" ? "blue" : "amber"}>{t(`rti.o.${r.outcome}` as MsgKey)}</Badge></Link></li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section id="reply" className="scroll-mt-24">
            <h2 className="mb-1 text-xl font-bold text-ink">{t("pd.reply")}</h2>
            <p className="mb-4 text-sm text-ink-2">{t("pd.replySub")}</p>
            {d.replies.length > 0 && (
              <ul className="mb-4 space-y-3">
                {d.replies.map((r) => (
                  <li key={r.id} className="card border-l-4 !border-l-blue p-4">
                    <div className="flex flex-wrap items-center gap-2"><Badge tone="blue" icon={<Megaphone className="size-3" />}>{t(`reply.s.${r.stance}` as MsgKey)}</Badge><span className="text-sm font-bold text-ink">{r.org}</span>{r.designation && <span className="text-xs text-ink-3">{r.designation}</span>}<span className="text-xs text-ink-3">· {fmtDate(r.created_at, lang)}</span></div>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <ReplyForm siteId={s.id} />
          </section>
        </div>

        {/* ------------------------------------------------------ right rail */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <HealthGauge health={d.health} />
          <div className="card p-5">
            <h3 className="text-base font-bold text-ink">{t("pd.action")}</h3>
            <div className="mt-3 space-y-2">
              <Button href={`/report?site=${s.id}`} className="w-full"><Camera className="size-4" />{t("pd.addEvidence")}</Button>
              <Button href={`/rti/new?site=${s.id}`} variant="soft" className="w-full"><FileSearch className="size-4" />{t("pd.askRecords")}</Button>
              {d.official_links.grievance && <Button href={d.official_links.grievance.url} variant="outline" className="w-full"><ShieldQuestion className="size-4" />{d.official_links.grievance.label}<ExternalLink className="size-3.5" /></Button>}
            </div>
            <p className="mt-3 text-xs text-ink-3">{t("pd.actionNote")}</p>
          </div>
          <div className="card p-5">
            <h3 className="text-base font-bold text-ink">{t("pd.official")}</h3>
            <ul className="mt-3 space-y-2 text-[13px]">
              {s.source_url && <li><a className="inline-flex items-center gap-1.5 font-semibold text-blue hover:underline" href={s.source_url} target="_blank" rel="noopener noreferrer">{s.source_label}<ExternalLink className="size-3" /></a></li>}
              {[d.official_links.tender, d.official_links.rti, d.official_links.cpgrams, d.official_links.gem].filter(Boolean).map((l) => (
                <li key={l!.url}><a className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink hover:underline" href={l!.url} target="_blank" rel="noopener noreferrer">{l!.label}<ExternalLink className="size-3" /></a></li>
              ))}
            </ul>
          </div>
          {d.nearby.length > 0 && (
            <div className="card p-5">
              <h3 className="text-base font-bold text-ink">{t("pd.nearby")}</h3>
              <ul className="mt-3 space-y-2">
                {d.nearby.map((n) => (
                  <li key={n.id}><Link href={`/projects/${n.slug}`} className="flex items-center justify-between gap-2 rounded-lg p-2 text-[13px] hover:bg-surface-muted"><span className="min-w-0 truncate font-semibold text-ink">{n.title}</span><span className="shrink-0 text-ink-3">{fmtDistance(n.distance_m)}</span></Link></li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      <p className="wrap mt-10 text-xs text-ink-3">{t("pd.legal")} <Link href="/legal#grievance" className="font-semibold text-blue hover:underline">{t("footer.grievance")}</Link></p>
    </div>
  );
}

function Stat({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return <div><p className="kicker">{k}</p><p className={`mt-0.5 text-[15px] font-bold ${muted ? "font-medium text-ink-3" : "text-ink"}`}>{v}</p></div>;
}
