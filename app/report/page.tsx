import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportWizard } from "@/components/report/wizard";

export const metadata: Metadata = { title: "Report what you see", description: "Add a photo, voice note or description of public work near you. We read the location, match it to a project and a moderator reviews it before it is published." };

export default function ReportPage() {
  return <Suspense><ReportWizard /></Suspense>;
}
