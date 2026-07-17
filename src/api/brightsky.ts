// Standalone client for the DWD Rheinstetten weather station via brightsky.
//
// Rheinstetten (DWD station 04177) sits just outside Karlsruhe and serves as the
// "undisturbed" baseline for deviation mode: an official, well-sited
// observation away from the urban heat island. The data is hourly observations.
//
// This is a different origin than the ArcGIS FeatureServer, so it uses plain
// `fetch` (CORS-friendly) rather than arcgis.ts's fetchJson.

import {
  BRIGHTSKY_BASE_URL as BASE_URL,
  DWD_RHEINSTETTEN_STATION_ID as DWD_STATION_ID,
} from "../config/endpoints";
import { isDemoMode, loadDemoApi } from "../demo/mode";

/** One hourly point: timestamp = epoch ms, temperature in °C. */
export interface DwdHourlyPoint {
  timestamp: number;
  temperature: number;
  /**
   * True for genuine measurements (brightsky `historical`, `current`, `synop`
   * sources), false for MOSMIX `forecast` hours. brightsky pads the rest of the
   * current day with forecast, so comparisons must never treat those as readings.
   */
  observed: boolean;
}

interface BrightskySource {
  id: number;
  observation_type: string; // "historical" | "current" | "forecast"
}

interface BrightskyResponse {
  weather?: Array<{
    timestamp: string;
    temperature: number | null;
    source_id?: number;
  }>;
  sources?: BrightskySource[];
}

interface BrightskyCurrentResponse {
  weather?: {
    timestamp: string;
    temperature: number | null;
    source_id?: number;
  };
  sources?: BrightskySource[];
}

/** Format a date as a local-calendar `YYYY-MM-DD` (Europe/Berlin parts). */
function toDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Fetch hourly Rheinstetten temperatures for the inclusive date range
 * [fromDate, toDate] in a single CORS request. Null temperatures are dropped;
 * the result is sorted ascending by time.
 */
export async function fetchRheinstettenHourly(
  fromDate: Date,
  toDate: Date,
  signal?: AbortSignal,
): Promise<DwdHourlyPoint[]> {
  if (isDemoMode()) return (await loadDemoApi()).brightskyHourly(fromDate, toDate);
  const url = new URL(`${BASE_URL}/weather`);
  const searchParams = url.searchParams;
  searchParams.set("date", toDateParam(fromDate));
  searchParams.set("last_date", toDateParam(toDate));
  searchParams.set("dwd_station_id", DWD_STATION_ID);
  searchParams.set("tz", "Europe/Berlin");

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    throw new Error(`brightsky request failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as BrightskyResponse;
  const weather = body.weather ?? [];

  // Map each source id to its observation type so forecast-padded hours can be
  // told apart from real measurements.
  const observationTypeBySourceId = new Map<number, string>();
  for (const source of body.sources ?? []) {
    observationTypeBySourceId.set(source.id, source.observation_type);
  }

  const points: DwdHourlyPoint[] = [];
  for (const weatherPoint of weather) {
    if (weatherPoint.temperature == null) continue;
    const observationType =
      weatherPoint.source_id != null
        ? observationTypeBySourceId.get(weatherPoint.source_id)
        : undefined;
    points.push({
      timestamp: Date.parse(weatherPoint.timestamp),
      temperature: weatherPoint.temperature,
      observed: isObservedSource(observationType),
    });
  }
  points.sort((a, b) => a.timestamp - b.timestamp);
  return points;
}

/** Fetch the latest Rheinstetten observation from Bright Sky's live endpoint. */
export async function fetchRheinstettenCurrent(
  signal?: AbortSignal,
): Promise<DwdHourlyPoint | null> {
  if (isDemoMode()) return (await loadDemoApi()).brightskyCurrent();
  const url = new URL(`${BASE_URL}/current_weather`);
  url.searchParams.set("dwd_station_id", DWD_STATION_ID);

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    throw new Error(`brightsky current request failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as BrightskyCurrentResponse;
  const weather = body.weather;
  if (!weather || weather.temperature == null) return null;

  const source = body.sources?.find((candidate) => candidate.id === weather.source_id);
  const observed = isObservedSource(source?.observation_type);
  return {
    timestamp: Date.parse(weather.timestamp),
    temperature: weather.temperature,
    observed,
  };
}

function isObservedSource(observationType: string | undefined): boolean {
  return (
    observationType === "historical" ||
    observationType === "current" ||
    observationType === "synop"
  );
}

/** Keep only genuine measurements, dropping forecast-padded hours. */
export function observedOnly(points: DwdHourlyPoint[]): DwdHourlyPoint[] {
  return points.filter((point) => point.observed);
}

/**
 * The most recent genuine observation no older than `maxAgeMs` (default 2 h)
 * relative to `now`. Returns null when the only readings are forecast or the
 * latest real observation is too stale to compare against live sensors — so a
 * live comparison never silently uses a forecast or an hours-old value.
 */
export function latestObservation(
  points: DwdHourlyPoint[],
  now = Date.now(),
  maxAgeMs = 2 * 60 * 60 * 1000,
): DwdHourlyPoint | null {
  let best: DwdHourlyPoint | null = null;
  for (const point of points) {
    if (!point.observed || point.timestamp > now) continue;
    if (best == null || point.timestamp > best.timestamp) best = point;
  }
  return best != null && now - best.timestamp <= maxAgeMs ? best : null;
}

/**
 * The point closest in time to `t`. Returns null if the nearest point is
 * farther than `maxGapMs` (default 90 min, since observations are hourly).
 */
export function nearestPoint(
  points: DwdHourlyPoint[],
  timestamp: number,
  maxGapMs = 90 * 60 * 1000,
): DwdHourlyPoint | null {
  let best: DwdHourlyPoint | null = null;
  let bestGap = Infinity;
  for (const point of points) {
    const gap = Math.abs(point.timestamp - timestamp);
    if (gap < bestGap) {
      bestGap = gap;
      best = point;
    }
  }
  return best != null && bestGap <= maxGapMs ? best : null;
}
