import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/login", "/report"] }], sitemap: `${site}/sitemap.xml` };
}
