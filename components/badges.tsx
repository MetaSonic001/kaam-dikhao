"use client";

import {
  BadgeCheck, Building2, CheckCircle2, CircleDashed, Clock, Construction, Droplets, Eye, FileText, Footprints, Lightbulb,
  MessageSquareWarning, OctagonAlert, Route, Satellite, Sparkles, TreePine, Trash2, TrainFront, Users, Waves, Radio, Camera,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "./ui";
import { useT } from "@/lib/i18n";
import { STATUS_META } from "@/lib/meta";
import type { Category, ReportStatus, SiteStatus } from "@/lib/types";
import type { MsgKey } from "@/lib/messages";

const STATUS_ICON: Record<SiteStatus, ReactNode> = {
  COMPLETED: <CheckCircle2 className="size-3.5" />,
  IN_PROGRESS: <Construction className="size-3.5" />,
  DELAYED: <Clock className="size-3.5" />,
  PLANNED: <CircleDashed className="size-3.5" />,
  TENDERED: <FileText className="size-3.5" />,
  AWARDED: <FileText className="size-3.5" />,
  UNDER_REVIEW: <Eye className="size-3.5" />,
  DISPUTED: <MessageSquareWarning className="size-3.5" />,
  INSUFFICIENT_EVIDENCE: <OctagonAlert className="size-3.5" />,
};

/** Always icon + text, never colour alone (WCAG 1.4.1). */
export function StatusBadge({ status, className }: { status: SiteStatus; className?: string }) {
  const t = useT();
  const m = STATUS_META[status] ?? STATUS_META.INSUFFICIENT_EVIDENCE;
  return <Badge tone={m.tone} icon={STATUS_ICON[status]} className={className}>{t(`status.${status}` as MsgKey)}</Badge>;
}

const REPORT_TONE = { VERIFIED: "green", DISPUTED: "amber", UNDER_REVIEW: "blue", SUBMITTED: "blue", REJECTED: "red" } as const;
export function EvidenceStateBadge({ status }: { status: ReportStatus }) {
  const t = useT();
  const icon = status === "VERIFIED" ? <BadgeCheck className="size-3.5" /> : status === "DISPUTED" ? <MessageSquareWarning className="size-3.5" /> : <Eye className="size-3.5" />;
  return <Badge tone={REPORT_TONE[status]} icon={icon}>{t(`evidence.${status}` as MsgKey)}</Badge>;
}

const ORIGIN = {
  osm: { tone: "blue", icon: <Radio className="size-3" />, key: "origin.osm" },
  official: { tone: "green", icon: <FileText className="size-3" />, key: "origin.official" },
  citizen: { tone: "amber", icon: <Users className="size-3" />, key: "origin.citizen" },
} as const;
export function OriginBadge({ origin }: { origin: "osm" | "official" | "citizen" }) {
  const t = useT();
  const o = ORIGIN[origin];
  return <Badge tone={o.tone} icon={o.icon}>{t(o.key as MsgKey)}</Badge>;
}

export function AiBadge({ label }: { label?: string }) {
  const t = useT();
  return <Badge tone="navy" icon={<Sparkles className="size-3" />}>{label ?? t("ai.candidate")}</Badge>;
}

export const CATEGORY_ICON: Record<Category, ReactNode> = {
  road: <Route />, bridge: <Construction />, transit: <TrainFront />, footpath: <Footprints />, drainage: <Waves />,
  building: <Building2 />, park: <TreePine />, water: <Droplets />, streetlight: <Lightbulb />, waste: <Trash2 />, other: <Construction />,
};

export function CategoryChip({ category, className }: { category: Category; className?: string }) {
  const t = useT();
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 [&_svg]:size-3.5 ${className ?? ""}`}>
      {CATEGORY_ICON[category] ?? CATEGORY_ICON.other}
      {t(`cat.${category}` as MsgKey)}
    </span>
  );
}

export const EvidenceIcons = { photo: Camera, satellite: Satellite };
