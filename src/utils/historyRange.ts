import type { TimeSeriesPoint } from "../api/sensorcity";

export type HistoryRange = "day" | "week" | "month" | "all";

export interface HistoryWindow {
  points: TimeSeriesPoint[];
  start: number;
  end: number;
  hasEarlier: boolean;
  hasLater: boolean;
}

const RANGE_DURATION: Record<Exclude<HistoryRange, "all">, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

/**
 * Return a chronological slice ending at the newest available reading. Using
 * the series endpoint rather than `Date.now()` keeps rolling or stale archives
 * useful and guarantees that a preset never produces an artificial empty view.
 */
export function buildHistoryWindow(
  points: TimeSeriesPoint[],
  range: HistoryRange,
  offset = 0,
): HistoryWindow | null {
  const chronological = [...points].sort(
    (first, second) => first.timestamp - second.timestamp,
  );
  if (chronological.length === 0) return null;

  const first = chronological[0].timestamp;
  const latest = chronological[chronological.length - 1].timestamp;
  if (range === "all") {
    return {
      points: chronological,
      start: first,
      end: latest,
      hasEarlier: false,
      hasLater: false,
    };
  }

  const safeOffset = Math.max(0, Math.floor(offset));
  const duration = RANGE_DURATION[range];
  const end = latest - safeOffset * duration;
  const start = end - duration;
  return {
    points: chronological.filter(
      (point) =>
        point.timestamp >= start &&
        (safeOffset === 0 ? point.timestamp <= end : point.timestamp < end),
    ),
    start,
    end,
    hasEarlier: first < start,
    hasLater: safeOffset > 0,
  };
}
