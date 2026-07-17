import { describe, expect, it } from "vitest";

import type { HistoryRow } from "../api/sensorcity";
import type { DepthProfile } from "../types";
import { buildDepthProfileGrid } from "./depthProfile";

const HOUR = 3_600_000;

const profile: DepthProfile = {
  key: "soil_moisture",
  unit: "%",
  ramp: "moisture",
  bands: [
    { field: "shallow", band: 0 },
    { field: "mid", band: 1 },
    { field: "deep", band: 2 },
  ],
};

function row(hoursFromStart: number, values: (number | null)[]): HistoryRow {
  return { timestamp: hoursFromStart * HOUR, values };
}

describe("buildDepthProfileGrid", () => {
  it("returns null when there is nothing to draw", () => {
    expect(buildDepthProfileGrid([], profile)).toBeNull();
    // Rows exist but no band carries a reading.
    expect(
      buildDepthProfileGrid([row(0, [null, null, null])], profile),
    ).toBeNull();
  });

  it("keeps one row per declared band, shallow→deep", () => {
    const grid = buildDepthProfileGrid([row(0, [10, 20, 30])], profile);

    expect(grid?.bands.map((b) => b.field)).toEqual(["shallow", "mid", "deep"]);
    expect(grid?.bands.map((b) => b.band)).toEqual([0, 1, 2]);
  });

  it("averages the readings that fall in the same column", () => {
    const rows = [row(0, [10, 20, 30]), row(1, [20, 30, 40])];
    const grid = buildDepthProfileGrid(rows, profile, { columns: 1 });

    expect(grid?.columns).toHaveLength(1);
    expect(grid?.bands[0].cells).toEqual([15]);
    expect(grid?.bands[2].cells).toEqual([35]);
  });

  it("spaces columns evenly in time and lands the newest row in the last one", () => {
    // Thirteen hourly readings (0h..12h) bucketed into four three-hour columns.
    const rows = Array.from({ length: 13 }, (_, i) => row(i, [i, i, i]));
    const grid = buildDepthProfileGrid(rows, profile, { columns: 4 });

    expect(grid?.from).toBe(0);
    expect(grid?.to).toBe(12 * HOUR);
    expect(grid?.columns.map((c) => c.from)).toEqual([
      0,
      3 * HOUR,
      6 * HOUR,
      9 * HOUR,
    ]);
    // The newest reading (12h) sits exactly on the upper bound, so the last
    // column is closed and averages 9..12 rather than dropping it past the end.
    expect(grid?.bands[0].cells).toEqual([1, 4, 7, 10.5]);
  });

  it("leaves a reporting gap null rather than interpolating across it", () => {
    // Four readings clustered at each end of a six-hour span: the two columns
    // in between must stay empty so the outage reads as an outage.
    const rows = [
      row(0, [1, 1, 1]),
      row(1, [3, 3, 3]),
      row(5, [4, 4, 4]),
      row(6, [6, 6, 6]),
    ];
    const grid = buildDepthProfileGrid(rows, profile, { columns: 4 });

    expect(grid?.bands[0].cells).toEqual([2, null, null, 5]);
  });

  it("tracks a band that reports while its neighbours do not", () => {
    const rows = [
      ...[0, 1, 2].map((h) => row(h, [null, 5, null])),
      ...[3, 4, 5].map((h) => row(h, [null, 7, null])),
    ];
    const grid = buildDepthProfileGrid(rows, profile, { columns: 2 });

    expect(grid?.bands[0].cells).toEqual([null, null]);
    expect(grid?.bands[1].cells).toEqual([5, 7]);
    expect(grid?.min).toBe(5);
    expect(grid?.max).toBe(7);
  });

  it("reports the value range across every band", () => {
    const rows = [
      ...[0, 1, 2].map((h) => row(h, [10, 20, 30])),
      ...[3, 4, 5].map((h) => row(h, [5, 20, 45])),
    ];
    const grid = buildDepthProfileGrid(rows, profile, { columns: 2 });

    expect(grid?.min).toBe(5);
    expect(grid?.max).toBe(45);
    expect(grid?.rowCount).toBe(6);
  });

  it("collapses a series with a single timestamp to one column", () => {
    const grid = buildDepthProfileGrid(
      [row(2, [10, 20, 30]), row(2, [20, 30, 40])],
      profile,
    );

    expect(grid?.columns).toEqual([{ from: 2 * HOUR, to: 2 * HOUR }]);
    expect(grid?.bands[0].cells).toEqual([15]);
  });

  it("never cuts columns finer than the probe's reporting cadence", () => {
    // 40 readings at a steady one-hour cadence. Asking for far more columns
    // than that must not slice the span below an hour a column.
    const rows = Array.from({ length: 40 }, (_, i) => row(i, [i, i, i]));
    const grid = buildDepthProfileGrid(rows, profile, { columns: 180 });

    const columnWidth = (grid!.to - grid!.from) / grid!.columns.length;
    expect(columnWidth).toBeGreaterThanOrEqual(HOUR);
  });

  it("does not invent gaps when readings jitter around their cadence", () => {
    // The real feed reports about hourly, but never exactly: bucketing on the
    // nominal interval leaves empty columns that read as outages. Every column
    // must hold a reading here, because the probe never actually stopped.
    const rows = Array.from({ length: 70 }, (_, i) =>
      row(i + (i % 3) * 0.05, [i, i, i]),
    );
    const grid = buildDepthProfileGrid(rows, profile);

    expect(grid?.bands[0].cells.some((cell) => cell == null)).toBe(false);
  });
});
