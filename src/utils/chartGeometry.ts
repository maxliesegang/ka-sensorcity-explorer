// Geometry for the time × value charts (LineChart, CityTemperatureChart).
//
// Pure and DOM-free: screen mapping, path building and hit-testing, with no
// React and no formatting. The chrome drawn from these numbers lives in
// `components/chart/ChartChrome.tsx`; each chart keeps only its own marks.
//
// `TimeValueScale` is the one data→screen mapping in the app. Every other
// `*Scale` under `utils/` is a *colour* scale (`buildAdaptiveTemperatureScale`,
// `buildDepthProfileScale`, …), which is why this module is named for geometry
// rather than for scales.
//
// Deliberately not shared with DepthProfileChart or SensorHistoryAnalysis: those
// place marks in categorical bands and hour slots, so they agree with this on
// the outer padding and nothing else.

export const CHART_WIDTH = 720;

export interface ChartPadding {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const CHART_PAD: ChartPadding = { top: 12, right: 12, bottom: 26, left: 48 };

/** The data range a chart is drawn over: time on x, values on y. */
export interface ChartExtent {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** A position in the chart's viewBox space — not a data point. */
export interface ScreenPoint {
  x: number;
  y: number;
}

export interface TimeValueScale {
  /** Timestamp → x in viewBox units. */
  x(timestamp: number): number;
  /** Value → y in viewBox units (inverted: larger values sit higher). */
  y(value: number): number;
}

/**
 * Map an extent onto the plot area. A zero-width or zero-height extent (one
 * point, or a flat series) is widened to 1 so the division stays finite and the
 * marks land at the top-left of the plot rather than at NaN.
 */
export function buildTimeValueScale(
  extent: ChartExtent,
  height: number,
  pad: ChartPadding = CHART_PAD,
  width: number = CHART_WIDTH,
): TimeValueScale {
  const spanX = extent.maxX - extent.minX || 1;
  const spanY = extent.maxY - extent.minY || 1;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  return {
    x: (timestamp) => pad.left + ((timestamp - extent.minX) / spanX) * plotW,
    y: (value) => pad.top + (1 - (value - extent.minY) / spanY) * plotH,
  };
}

/** Polyline through the points, in order. Empty for an empty input. */
export function linePath(points: readonly ScreenPoint[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

/**
 * Closed band between two edges sharing an x sequence: forward along `upper`,
 * back along `lower`. Used for a min–max envelope.
 */
export function bandPath(
  upper: readonly ScreenPoint[],
  lower: readonly ScreenPoint[],
): string {
  if (upper.length === 0 || lower.length === 0) return "";
  const back = [...lower]
    .reverse()
    .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  return `${linePath(upper)} ${back} Z`;
}

/**
 * Index of the value in `xs` closest to `x`, or null when `xs` is empty.
 *
 * Binary search rather than a scan: this runs on every mousemove, and a chart
 * over a full rolling archive carries thousands of points. `xs` must be sorted
 * ascending, which is what every archive reader here returns.
 */
export function nearestIndexAtX(xs: readonly number[], x: number): number | null {
  if (xs.length === 0) return null;

  let low = 0;
  let high = xs.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (xs[mid] < x) low = mid + 1;
    else high = mid;
  }
  // `low` is the first index at or after `x`; its predecessor may be closer.
  if (low > 0 && Math.abs(xs[low - 1] - x) <= Math.abs(xs[low] - x)) return low - 1;
  return low;
}
