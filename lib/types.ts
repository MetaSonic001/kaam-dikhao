export type Lang = "en" | "hi" | "mr";

export type SiteStatus =
  | "PLANNED" | "TENDERED" | "AWARDED" | "IN_PROGRESS" | "COMPLETED"
  | "DELAYED" | "UNDER_REVIEW" | "DISPUTED" | "INSUFFICIENT_EVIDENCE";

export type Category =
  | "road" | "drainage" | "footpath" | "park" | "bridge" | "water"
  | "building" | "streetlight" | "waste" | "transit" | "other";

export type ReportStatus = "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "DISPUTED" | "REJECTED";
export type Observation = "progress" | "completed" | "issue" | "not_started" | "other";

export interface SiteListItem {
  id: string; slug: string; title: string; category: Category; status: SiteStatus;
  lat: number; lng: number; locality: string | null; ward: string | null; city: string | null; state: string | null;
  origin: "osm" | "official" | "citizen"; agency: string | null; contractor: string | null;
  sanctioned_amount: number | null; expected_completion: string | null; source_label: string | null;
  last_synced_at: string | null; created_at: string; updated_at: string;
  evidence_count: number; verified_count: number; last_evidence_at: string | null; distance_m?: number;
}

export interface Site extends SiteListItem {
  description: string | null; address: string | null; pincode: string | null;
  awarded_amount: number | null; work_order_date: string | null; actual_completion: string | null;
  source_url: string | null; claim_text: string | null; geometry: GeoJSON.Geometry | null;
  tags: Record<string, unknown>; published: boolean;
}

export interface Report {
  id: string; kind: string; category: string | null; observation: Observation | null; note_public: string | null;
  media_url: string | null; thumb_url: string | null; captured_at: string | null; lat: number | null; lng: number | null;
  location_source: string | null; distance_to_site_m: number | null; exif: Record<string, unknown>;
  ai: { visible?: string[]; issues?: string[]; confidence?: number; category?: string } | null;
  status: ReportStatus; moderation_reason: string | null; moderated_at: string | null; created_at: string;
}

export interface HealthComponent { value: number | null; weight: number; note: string }
export interface Health {
  score: number | null; label: "good" | "mixed" | "attention" | "insufficient"; coverage: number;
  components: Record<"timeline" | "records" | "ground" | "citizen", HealthComponent>; disclaimer: string;
}

export interface SatFrame { kind: string; scene_id: string; acquired_at: string; cloud_cover: number | null; image_url: string; metrics: Record<string, unknown> }
export interface SatChange extends SatFrame {
  metrics: {
    before_date: string; after_date: string; changed_pixel_share: number; level: "low" | "moderate" | "high";
    mean_ndvi_before: number; mean_ndvi_after: number; window_m: number;
  };
}
export interface Satellite { frames: SatFrame[]; change: SatChange | null; label: string; source: string; updated_at: string | null }

export interface TimelineEvent { at: string; kind: string; title: string; detail: string | null; source: string | null; url: string | null }
export interface Link { label: string; url: string }

export interface SiteDetail {
  site: Site; health: Health;
  timeline_state: { known: boolean; expected?: string; days_late?: number; completed?: boolean };
  reports: Report[]; pending_reports: number; my_reports: Report[];
  documents: { id: string; kind: string; title: string | null; file_url: string | null; source_url: string | null; created_at: string }[];
  rtis: { id: string; reference: string | null; subject: string; authority: string; outcome: string; filed_on: string | null; response_on: string | null }[];
  replies: { id: string; org: string; author_name: string | null; designation: string | null; body: string; doc_url: string | null; stance: string; created_at: string }[];
  satellite: Satellite; events: TimelineEvent[]; missing_records: string[];
  official_links: { grievance?: Link; tender?: Link; rti: Link; cpgrams: Link; gem: Link; body?: string | null };
  nearby: { id: string; slug: string; title: string; category: Category; status: SiteStatus; distance_m: number }[];
  following: boolean; freshness: { last_synced_at: string | null; origin: string };
}

export interface City {
  slug: string; name: string; state: string; center: [number, number]; zoom: number; bbox: [number, number, number, number];
  body: string; sites: number; delayed: number; completed: number; last_synced: string | null;
  grievance: Link; tender: Link;
}

export interface Stats {
  sites: number; by_status: Record<string, number>; by_category: Record<string, number>;
  reports: { verified: number; disputed: number; pending: number; rejected: number };
  sites_with_evidence: number; evidence_coverage_pct: number; rtis: number; sanctioned_total: number;
  sites_with_amount: number; cities_live: number; last_synced_at: string | null;
}

export interface RecentReport {
  id: string; observation: Observation | null; note_public: string | null; thumb_url: string | null;
  captured_at: string | null; created_at: string; site_slug: string; site_title: string; locality: string | null; city: string | null;
}

export interface RtiItem {
  id: string; reference: string | null; subject: string; authority: string; outcome: string; filed_on: string | null;
  response_on: string | null; summary_ai: string | null; city: string | null; site_id: string | null;
  days_taken: number | null; within_30_days: boolean;
}

export interface Me { id: string; email: string | null; role: string; lang: Lang; submissions: number; verified: number; following: { slug: string; title: string; status: string }[] }
