import type { Metadata } from "next";
import { Suspense } from "react";
import { Explorer } from "@/components/explore/explorer";
import { apiSafe } from "@/lib/api";
import type { City } from "@/lib/types";

export const metadata: Metadata = { title: "Explore the map", description: "Live map of public works across Indian cities with satellite history from 2016." };
export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const cities = (await apiSafe<City[]>("/api/cities")) ?? [];
  return (
    <Suspense fallback={<div className="grid h-[70vh] place-items-center"><div className="skeleton h-40 w-72" /></div>}>
      <Explorer cities={cities} />
    </Suspense>
  );
}
