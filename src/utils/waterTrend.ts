// Which way a river is going, from a gauge's retained level history.
//
// A gauge's *level* on its own says little to a resident — the Rhine at Maxau
// reads 310 cm on an ordinary day and the Alb 40 — but "10 cm lower than half a
// day ago" reads the same on every river, which is why the overview shows the
// change rather than ranking the levels against each other.
//
// Pure and DOM-free; the fetching lives in `api/waterTrends.ts`.

import type { TimeSeriesPoint } from "../api/sensorcity";

/** How far back a trend looks. */
export const WATER_TREND_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * Below this the level is called steady rather than rising or falling: the
 * gauges publish centimetres, and naming a 1 cm drift a trend overstates it.
 */
const STEADY_THRESHOLD_CM = 1;

export type WaterTrendDirection = "rising" | "falling" | "steady";

export interface WaterTrend {
  direction: WaterTrendDirection;
  /** Signed change in cm across the window. */
  delta: number;
  /** The window the change was measured over (epoch ms). */
  from: number;
  to: number;
}

/**
 * The change across the `windowMs` ending at the series' **newest** point, not
 * at the current clock: the upstream archive lags by hours at a time, and a
 * trend measured to now would silently become "no data" whenever it does. The
 * window it actually covers is carried on the result, so the UI can say when.
 *
 * Null when the series doesn't reach back a full window — a shorter span is a
 * different question, and answering it as if it were this one would understate
 * the change.
 *
 * `points` must be chronological, as every archive reader here returns them.
 */
export function getWaterTrend(
  points: readonly TimeSeriesPoint[],
  windowMs: number = WATER_TREND_WINDOW_MS,
): WaterTrend | null {
  const latest = points[points.length - 1];
  if (!latest) return null;

  const start = latest.timestamp - windowMs;
  // The newest point at or before the window start: walking back from the end
  // beats scanning forward, since the window is a small tail of the archive.
  let earlier: TimeSeriesPoint | undefined;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index].timestamp <= start) {
      earlier = points[index];
      break;
    }
  }
  if (!earlier) return null;

  const delta = latest.value - earlier.value;
  const direction: WaterTrendDirection =
    Math.abs(delta) < STEADY_THRESHOLD_CM ? "steady" : delta > 0 ? "rising" : "falling";

  return { direction, delta, from: earlier.timestamp, to: latest.timestamp };
}
