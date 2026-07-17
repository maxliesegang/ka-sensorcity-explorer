import { PEGELONLINE_BASE_URL as BASE_URL } from "../config/endpoints";
import { isDemoMode, loadDemoApi } from "../demo/mode";
import { toFiniteNumber } from "../utils/number";
import type { TimeSeriesPoint } from "./sensorcity";
const DEFAULT_WINDOW = "P30D";

interface PegelOnlineMeasurement {
  timestamp?: string;
  value?: number | null;
}

export interface PegelOnlineHistoryOptions {
  /** ISO-8601 duration or timestamp accepted by PEGELONLINE, e.g. `P30D`. */
  start?: string;
}

/**
 * Fetch measured water-level history from PEGELONLINE.
 *
 * PEGELONLINE exposes recent station measurements as JSON/CSV/PNG. The app uses
 * JSON and keeps the function generic over station + parameter so adding another
 * compatible gauge is just config.
 */
export async function fetchPegelOnlineHistory(
  stationUuid: string,
  parameter: string,
  options: PegelOnlineHistoryOptions = {},
  signal?: AbortSignal,
): Promise<TimeSeriesPoint[]> {
  if (isDemoMode()) return (await loadDemoApi()).pegelHistory(stationUuid, parameter);
  const url = new URL(
    `${BASE_URL}/stations/${encodeURIComponent(stationUuid)}/${encodeURIComponent(
      parameter,
    )}/measurements.json`,
  );
  url.searchParams.set("start", options.start ?? DEFAULT_WINDOW);

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`PEGELONLINE request failed: HTTP ${res.status}`);
  }

  const rows = (await res.json()) as PegelOnlineMeasurement[];
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const timestamp = row.timestamp ? Date.parse(row.timestamp) : NaN;
      const value = toFiniteNumber(row.value);
      return Number.isFinite(timestamp) && value != null ? { timestamp, value } : null;
    })
    .filter((point): point is TimeSeriesPoint => point != null)
    .sort((a, b) => a.timestamp - b.timestamp);
}
