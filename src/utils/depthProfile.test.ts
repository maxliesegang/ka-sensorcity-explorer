import { describe, expect, it } from "vitest";

import type { HistoryRow } from "../api/sensorcity";
import type { DepthProfile } from "../types";
import { buildDepthProfileGrid } from "./depthProfile";
import type { DepthProfileGrid } from "./depthProfile";

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

/** One band's cell values, nulls kept — what most assertions here are about. */
function cellValues(grid: DepthProfileGrid | null, band: number) {
  return grid?.bands[band].cells.map((cell) => cell?.value ?? null);
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
    expect(cellValues(grid, 0)).toEqual([15]);
    expect(cellValues(grid, 2)).toEqual([35]);
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
    expect(cellValues(grid, 0)).toEqual([1, 4, 7, 10.5]);
  });

  it("interpolates a short reporting gap, marking what it filled in", () => {
    // Four readings clustered at each end of a six-hour span: the two columns
    // in between are a short dropout, bridged so the trend stays comparable
    // across it — and flagged, because the probe reported nothing there.
    const rows = [
      row(0, [1, 1, 1]),
      row(1, [3, 3, 3]),
      row(5, [4, 4, 4]),
      row(6, [6, 6, 6]),
    ];
    const grid = buildDepthProfileGrid(rows, profile, { columns: 4 });

    expect(grid?.bands[0].cells).toEqual([
      { value: 2, isInterpolated: false },
      { value: 3, isInterpolated: true },
      { value: 4, isInterpolated: true },
      { value: 5, isInterpolated: false },
    ]);
  });

  it("leaves a long outage empty rather than inventing a ramp across it", () => {
    // Hourly readings, then a 16-hour silence, then hourly again. Nothing
    // constrains what the probe did in between, so those columns stay empty and
    // read as the outage they are.
    const rows = [0, 1, 2, 3, 20, 21, 22, 23].map((h) => row(h, [h, h, h]));
    const grid = buildDepthProfileGrid(rows, profile, { columns: 24 });
    const cells = grid!.bands[0].cells;

    expect(cells.some((cell) => cell == null)).toBe(true);
    expect(cells.every((cell) => cell == null || !cell.isInterpolated)).toBe(true);
  });

  it("never extrapolates past the readings at either end", () => {
    // This band reports only in the middle of the span. The columns before its
    // first reading and after its last have a value on one side only, which
    // infers nothing — a one-sided gap is never filled, however short.
    const rows = Array.from({ length: 12 }, (_, h) =>
      row(h, [h >= 4 && h <= 7 ? h : null, 1, 1]),
    );
    const grid = buildDepthProfileGrid(rows, profile, { columns: 12 });
    const cells = grid!.bands[0].cells;

    expect(cells[0]).toBeNull();
    expect(cells[cells.length - 1]).toBeNull();
    expect(cells.some((cell) => cell != null)).toBe(true);
  });

  it("tracks a band that reports while its neighbours do not", () => {
    const rows = [
      ...[0, 1, 2].map((h) => row(h, [null, 5, null])),
      ...[3, 4, 5].map((h) => row(h, [null, 7, null])),
    ];
    const grid = buildDepthProfileGrid(rows, profile, { columns: 2 });

    expect(cellValues(grid, 0)).toEqual([null, null]);
    expect(cellValues(grid, 1)).toEqual([5, 7]);
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
    expect(cellValues(grid, 0)).toEqual([15]);
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
