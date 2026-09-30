import type { Lang } from "./types";

const LOCALE: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

export function fmtDate(iso: string | null | undefined, lang: Lang = "en", withDay = true): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(
    LOCALE[lang],
    withDay ? { day: "numeric", month: "short", year: "numeric" } : { month: "short", year: "numeric" },
  ).format(d);
}

export function fmtNum(n: number | null | undefined, lang: Lang = "en"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}

/** ₹48.75 L / ₹12.4 Cr / ₹48,000, using Indian numbering and locale digits. */
export function fmtInr(v: number | null | undefined, lang: Lang = "en"): string {
  if (v == null) return "—";
  const nf = (x: number, max = 2) => new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: max }).format(x);
  const unit = lang === "en" ? { cr: "Cr", l: "L" } : lang === "hi" ? { cr: "करोड़", l: "लाख" } : { cr: "कोटी", l: "लाख" };
  if (v >= 1e7) return `₹${nf(v / 1e7)} ${unit.cr}`;
  if (v >= 1e5) return `₹${nf(v / 1e5)} ${unit.l}`;
  return `₹${nf(v, 0)}`;
}

export function fmtDistance(m: number | null | undefined): string {
  if (m == null) return "";
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function timeAgo(iso: string | null | undefined, lang: Lang = "en"): string {
  if (!iso) return "";
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / (86400 * 30)), "month");
}

export function fmtCoord(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
}
