// Small formatting helpers shared across views. These read the active language
// from the i18n singleton, so callers that subscribe to translations (via
// `useTranslation`) re-render and re-format when the language changes.

import i18n from "../i18n";

const NOT_AVAILABLE = "—";

/** Format an epoch-ms timestamp as a localized date-time string. */
export function formatTimestamp(epochMs: number | null): string {
  if (epochMs == null) return NOT_AVAILABLE;
  return new Date(epochMs).toLocaleString(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Format an epoch-ms timestamp as a localized time of day, e.g. "14:05". */
export function formatTime(epochMs: number | null): string {
  if (epochMs == null) return NOT_AVAILABLE;
  return new Date(epochMs).toLocaleTimeString(i18n.language, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format a numeric reading with an optional unit. */
export function formatValue(value: unknown, unit?: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return NOT_AVAILABLE;
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
  return unit ? `${rounded} ${unit}`.trim() : String(rounded);
}

/** Format a signed delta like "+1.3", "0.0", "-2.1" (1 decimal place). */
export function formatSignedDelta(value: number, unit?: string): string {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  const formatted = `${sign}${Math.abs(rounded).toFixed(1)}`;
  return unit ? `${formatted} ${unit}` : formatted;
}

/** Relative age, e.g. "5 min ago", for freshness cues. */
export function timeAgo(epochMs: number | null): string {
  if (epochMs == null) return NOT_AVAILABLE;
  const t = i18n.t;
  const min = Math.round((Date.now() - epochMs) / 60000);
  if (min < 1) return t("time.justNow");
  if (min < 60) return t("time.minAgo", { count: min });
  const h = Math.round(min / 60);
  if (h < 24) return t("time.hoursAgo", { count: h });
  const d = Math.round(h / 24);
  return t("time.daysAgo", { count: d });
}
