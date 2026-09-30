import type { Category, SiteStatus } from "./types";

/** Semantic status palette: one source of truth for badges, map markers and legends. */
export const STATUS_META: Record<SiteStatus, { color: string; tone: "green" | "orange" | "red" | "blue" | "amber" | "gray"; order: number }> = {
  IN_PROGRESS: { color: "#f97316", tone: "orange", order: 1 },
  DELAYED: { color: "#c93c3c", tone: "red", order: 0 },
  COMPLETED: { color: "#16805a", tone: "green", order: 2 },
  PLANNED: { color: "#2563a8", tone: "blue", order: 5 },
  TENDERED: { color: "#2563a8", tone: "blue", order: 6 },
  AWARDED: { color: "#2563a8", tone: "blue", order: 7 },
  UNDER_REVIEW: { color: "#b47b0a", tone: "amber", order: 3 },
  DISPUTED: { color: "#b47b0a", tone: "amber", order: 4 },
  INSUFFICIENT_EVIDENCE: { color: "#7c8890", tone: "gray", order: 8 },
};

export const MAP_STATUS_LEGEND: SiteStatus[] = ["COMPLETED", "IN_PROGRESS", "DELAYED", "PLANNED", "UNDER_REVIEW", "INSUFFICIENT_EVIDENCE"];

export const CATEGORIES: Category[] = ["road", "bridge", "transit", "footpath", "drainage", "building", "park", "water", "streetlight", "waste", "other"];

export const ISSUE_TYPES = ["pothole", "cracks", "standing_water", "uneven_surface", "open_manhole", "debris", "unfinished_surface", "broken_footpath"] as const;

export const CITY_LIST = ["mumbai", "delhi", "bengaluru", "chennai", "kolkata", "hyderabad", "pune", "ahmedabad", "lucknow", "jaipur"];
