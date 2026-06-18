import { describe, expect, it } from "vitest";

import type { TimeSeriesPoint } from "../api/sensorcity";
import { computeHistoryStats } from "./historyStats";

function atLocalHour(hour: number, minute = 0): number {
  return new Date(2025, 0, 1, hour, minute).getTime();
}

describe("computeHistoryStats", () => {
  it("returns null for an empty series", () => {
    expect(computeHistoryStats([])).toBeNull();
  });

  it("computes core statistics from unsorted points", () => {
    const points: TimeSeriesPoint[] = [
      { timestamp: atLocalHour(3), value: 30 },
      { timestamp: atLocalHour(0), value: 10 },
      { timestamp: atLocalHour(1, 30), value: 14 },
      { timestamp: atLocalHour(4), value: 34 },
      { timestamp: atLocalHour(2), value: 20 },
      { timestamp: atLocalHour(1), value: 12 },
    ];

    const stats = computeHistoryStats(points);

    expect(stats).not.toBeNull();
    expect(stats).toMatchObject({
      count: 6,
      min: 10,
      max: 34,
      mean: 20,
      median: 17,
      range: 24,
      latest: 34,
      latestAt: atLocalHour(4),
      first: 10,
      firstAt: atLocalHour(0),
      trend: { delta: 21, direction: "up" },
    });
    expect(stats?.stdDev).toBeCloseTo(Math.sqrt(496 / 6));
  });

  it("groups hourly averages and picks peak and trough hours", () => {
    const stats = computeHistoryStats([
      { timestamp: atLocalHour(2), value: 20 },
      { timestamp: atLocalHour(1), value: 12 },
      { timestamp: atLocalHour(1, 30), value: 18 },
      { timestamp: atLocalHour(4), value: 6 },
    ]);

    expect(stats?.hourly).toEqual([
      { hour: 1, mean: 15, count: 2 },
      { hour: 2, mean: 20, count: 1 },
      { hour: 4, mean: 6, count: 1 },
    ]);
    expect(stats?.peakHour).toEqual({ hour: 2, mean: 20, count: 1 });
    expect(stats?.troughHour).toEqual({ hour: 4, mean: 6, count: 1 });
  });

  it("keeps small relative trends steady", () => {
    const stats = computeHistoryStats([
      { timestamp: atLocalHour(0), value: 100 },
      { timestamp: atLocalHour(1), value: 100 },
      { timestamp: atLocalHour(2), value: 50 },
      { timestamp: atLocalHour(3), value: 150 },
      { timestamp: atLocalHour(4), value: 102 },
      { timestamp: atLocalHour(5), value: 102 },
    ]);

    expect(stats?.trend).toEqual({ delta: 2, direction: "steady" });
  });

  it("handles flat series without forcing a trend direction", () => {
    const stats = computeHistoryStats([
      { timestamp: atLocalHour(0), value: 5 },
      { timestamp: atLocalHour(1), value: 5 },
      { timestamp: atLocalHour(2), value: 5 },
    ]);

    expect(stats).toMatchObject({
      min: 5,
      max: 5,
      mean: 5,
      median: 5,
      range: 0,
      stdDev: 0,
      trend: { delta: 0, direction: "steady" },
    });
  });
});
