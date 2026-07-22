// Single-series historical statistics for one sensor's measurement history.
//
// The single-sensor analog of `api/temperatureInsights.ts`: instead of comparing
// sensors against each other, this summarizes one time series — central
// tendency and spread (min/max/mean/median/stdDev/range), endpoints (first /
// latest), a coarse earlier-vs-recent trend, and a per-hour-of-day ("diurnal")
// average pattern with its peak and trough hours.

import type { TimeSeriesPoint } from "../api/sensorcity";

export interface HourlyAverage {
  hour: number; // local hour 0..23
  mean: number; // mean value of points falling in that hour
  count: number; // number of points in that hour
}

export interface HistoryStats {
  count: number; // number of points
  min: number;
  max: number;
  mean: number;
  median: number;
  range: number; // max - min
  stdDev: number; // population standard deviation (volatility)
  latest: number; // value of the newest point (largest timestamp)
  latestAt: number; // epoch ms of newest point
  first: number; // value of the oldest point (smallest timestamp)
  firstAt: number; // epoch ms of oldest point
  trend: {
    delta: number; // recentMean - earlierMean
    direction: "up" | "down" | "steady"; // see threshold note below
  };
  hourly: HourlyAverage[]; // ascending by hour; ONLY hours that have data
  peakHour: HourlyAverage | null; // hour with the highest mean (null if no data)
  troughHour: HourlyAverage | null; // hour with the lowest mean (null if no data)
}

// A trend only counts as up/down once the earlier-vs-recent shift exceeds this
// fraction of the series' full range; below it the series reads as "steady".
// Expressed relative to range so the verdict is unit-agnostic.
const TREND_THRESHOLD_FRACTION = 0.05;

/** Mean of a numeric array (0 for an empty array). */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

/**
 * Build single-series historical statistics for one sensor's history.
 * Returns null for empty input. Points need not be sorted: endpoints are
 * derived by min/max timestamp, and the trend uses a chronological sort.
 */
export function buildHistoryStats(points: TimeSeriesPoint[]): HistoryStats | null {
  const count = points.length;
  if (count === 0) return null;

  // Single pass for min/max/sum plus endpoint tracking by timestamp.
  let min = points[0].value;
  let max = points[0].value;
  let sum = 0;
  let latest = points[0].value;
  let latestAt = points[0].timestamp;
  let first = points[0].value;
  let firstAt = points[0].timestamp;
  for (const point of points) {
    if (point.value < min) min = point.value;
    if (point.value > max) max = point.value;
    sum += point.value;
    if (point.timestamp > latestAt) {
      latestAt = point.timestamp;
      latest = point.value;
    }
    if (point.timestamp < firstAt) {
      firstAt = point.timestamp;
      first = point.value;
    }
  }
  const meanValue = sum / count;
  const range = max - min;

  // Population standard deviation: sqrt(mean of squared deviations).
  let sqDevSum = 0;
  for (const point of points) {
    const deviation = point.value - meanValue;
    sqDevSum += deviation * deviation;
  }
  const stdDev = Math.sqrt(sqDevSum / count);

  // Median over a sorted copy of the values (average the two middle values
  // for even counts).
  const sorted = points
    .map((point) => point.value)
    .sort((firstValue, secondValue) => firstValue - secondValue);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  // Trend: compare the earliest third against the most recent third. Needs at
  // least 3 points to form two non-empty thirds; otherwise it's "steady".
  let delta = 0;
  let direction: "up" | "down" | "steady" = "steady";
  if (count >= 3) {
    const chronological = [...points].sort(
      (firstPoint, secondPoint) => firstPoint.timestamp - secondPoint.timestamp,
    );
    const third = Math.floor(count / 3);
    const earlierMean = mean(
      chronological.slice(0, third).map((point) => point.value),
    );
    const recentMean = mean(
      chronological.slice(count - third).map((point) => point.value),
    );
    delta = recentMean - earlierMean;
    if (range !== 0 && Math.abs(delta) >= TREND_THRESHOLD_FRACTION * range) {
      direction = delta > 0 ? "up" : "down";
    }
  }

  // Per-hour-of-day buckets keyed by local hour (0..23).
  const hourBuckets = new Map<number, { sum: number; count: number }>();
  for (const point of points) {
    const hour = new Date(point.timestamp).getHours();
    const bucket = hourBuckets.get(hour);
    if (bucket) {
      bucket.sum += point.value;
      bucket.count += 1;
    } else {
      hourBuckets.set(hour, { sum: point.value, count: 1 });
    }
  }
  const hourly: HourlyAverage[] = [];
  for (const [hour, { sum: hSum, count: hCount }] of hourBuckets) {
    hourly.push({ hour, mean: hSum / hCount, count: hCount });
  }
  hourly.sort((a, b) => a.hour - b.hour);

  // Peak / trough = hourly entries with the highest / lowest mean.
  let peakHour: HourlyAverage | null = null;
  let troughHour: HourlyAverage | null = null;
  for (const hourlyAverage of hourly) {
    if (peakHour == null || hourlyAverage.mean > peakHour.mean) {
      peakHour = hourlyAverage;
    }
    if (troughHour == null || hourlyAverage.mean < troughHour.mean) {
      troughHour = hourlyAverage;
    }
  }

  return {
    count,
    min,
    max,
    mean: meanValue,
    median,
    range,
    stdDev,
    latest,
    latestAt,
    first,
    firstAt,
    trend: { delta, direction },
    hourly,
    peakHour,
    troughHour,
  };
}
