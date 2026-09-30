import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectsBrowser } from "@/components/projects/browser";
import { apiSafe } from "@/lib/api";
import type { City } from "@/lib/types";

export const metadata: Metadata = { title: "Public works near you", description: "Search live public works across Indian cities by area, type, agency or status." };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const cities = (await apiSafe<City[]>("/api/cities")) ?? [];
  return <Suspense><ProjectsBrowser cities={cities} /></Suspense>;
}
