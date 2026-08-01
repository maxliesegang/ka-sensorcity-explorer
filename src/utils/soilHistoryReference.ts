// A probe's own history is the useful baseline for "does this spot need water?".
// Keep the statistics and classification independent from React and the API so
// the rule is explicit, testable, and easy to tune when more history is available.

import type { DepthProfileRamp } from "../types";

/** Enough readings for quartiles to describe a range rather than a few samples. */
export const MIN_REFERENCE_READINGS = 8;

export interface SoilHistoryStats {
  count: number;
  min: number;
  lowerQuartile: number;
  median: number;
  mean: number;
  upperQuartile: number;
  max: number;
}

export type SoilHistoryStatus = "lower" | "normal" | "higher" | "unavailable";

function quantile(sorted: readonly number[], position: number): number {
  const index = (sorted.length - 1) * position;
  const lowerIndex = Math.floor(index);
  const fraction = index - lowerIndex;
  const lower = sorted[lowerIndex];
  const upper = sorted[Math.min(lowerIndex + 1, sorted.length - 1)];
  return lower + (upper - lower) * fraction;
}

/** Build a robust normal range (middle 50%) while retaining min/mean/max for context. */
export function buildSoilHistoryStats(
  values: readonly number[],
): SoilHistoryStats | null {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length < MIN_REFERENCE_READINGS) return null;
  const sum = finite.reduce((total, value) => total + value, 0);
  return {
    count: finite.length,
    min: finite[0],
    lowerQuartile: quantile(finite, 0.25),
    median: quantile(finite, 0.5),
    mean: sum / finite.length,
    upperQuartile: quantile(finite, 0.75),
    max: finite[finite.length - 1],
  };
}

/** Compare a current reading with the middle half of that same probe's history. */
export function classifySoilReading(
  value: number,
  stats: SoilHistoryStats | null | undefined,
): SoilHistoryStatus {
  if (!stats) return "unavailable";
  if (value < stats.lowerQuartile) return "lower";
  if (value > stats.upperQuartile) return "higher";
  return "normal";
}

/** Stable category colours: dry/cool, normal, wet/warm, and no reference. */
export function soilHistoryStatusColor(
  ramp: DepthProfileRamp,
  status: SoilHistoryStatus,
): string {
  if (status === "unavailable") return "#777b8f";
  if (status === "normal") return "#e5d8b6";
  if (ramp === "moisture") return status === "lower" ? "#b85c2b" : "#2477b3";
  return status === "lower" ? "#3478b8" : "#c4473d";
}

