import type { MetadataRoute } from "next";
import { api, qs } from "@/lib/api";
import type { SiteListItem } from "@/lib/types";

const site = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ["", "/explore", "/projects", "/report-cards", "/rti", "/ask", "/civic-watch", "/transparency", "/methodology", "/about", "/legal"].map((p) => ({ url: `${site}${p}`, changeFrequency: "daily" as const }));
  try {
    const r = await api<{ items: SiteListItem[] }>(`/api/sites${qs({ limit: 100, sort: "recent" })}`);
    return [...fixed, ...r.items.map((s) => ({ url: `${site}/projects/${s.slug}`, lastModified: s.updated_at, changeFrequency: "daily" as const }))];
  } catch {
    return fixed;
  }
}
