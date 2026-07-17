import { describe, expect, it } from "vitest";

import type { DepthProfile } from "../types";
import type { DepthProfileCell, DepthProfileGrid } from "./depthProfile";
import {
  buildDepthProfileView,
  getDefaultDepthProfileMode,
} from "./depthProfileView";

const HOUR = 60 * 60 * 1000;

function cell(value: number, isInterpolated = false): DepthProfileCell {
  return { value, isInterpolated };
}

function grid(
  rows: Array<Array<DepthProfileCell | null>>,
  hours = rows[0]?.length ?? 0,
): DepthProfileGrid {
  return {
    columns: Array.from({ length: hours }, (_, index) => ({
      from: index * HOUR,
      to: (index + 1) * HOUR,
    })),
    bands: rows.map((cells, band) => ({ field: `band-${band}`, band, cells })),
    from: 0,
    to: hours * HOUR,
    min: 0,
    max: 100,
    rowCount: hours,
  };
}

describe("buildDepthProfileView", () => {
  it("keeps the source grid untouched in absolute mode", () => {
    const source = grid([[cell(10), cell(12)]]);

    expect(buildDepthProfileView(source, "absolute").grid).toBe(source);
  });

  it("removes each band's fixed offset in development mode", () => {
    const source = grid([
      [cell(10), cell(12), cell(14)],
      [cell(50), cell(52), cell(54)],
    ]);
    const view = buildDepthProfileView(source, "development");

    expect(view.grid.bands.map((band) => band.cells.map((c) => c?.value))).toEqual([
      [-2, 0, 2],
      [-2, 0, 2],
    ]);
    expect(view.grid.min).toBe(-2);
    expect(view.grid.max).toBe(2);
  });

  it("uses measured medians and preserves gaps and interpolation provenance", () => {
    const source = grid([
      [cell(10), cell(100, true), null, cell(14)],
    ]);
    const view = buildDepthProfileView(source, "development");

    // The measured baseline is (10 + 14) / 2 = 12; the filled-in outlier does
    // not move it, but remains visibly marked after the transformation.
    expect(view.grid.bands[0].cells).toEqual([
      cell(-2),
      cell(88, true),
      null,
      cell(2),
    ]);
    expect(view.grid.min).toBe(-2);
    expect(view.grid.max).toBe(2);
  });

  it("reports recent 24-hour changes from measured cells", () => {
    const source = grid([
      Array.from({ length: 25 }, (_, hour) => cell(10 + hour)),
      Array.from({ length: 25 }, (_, hour) => cell(50 - hour / 2)),
    ]);

    expect(buildDepthProfileView(source, "development").changes24h).toEqual([
      { field: "band-0", band: 0, delta: 24 },
      { field: "band-1", band: 1, delta: -12 },
    ]);
  });

  it("does not claim a 24-hour change from a short or interpolated-only window", () => {
    const short = grid([[cell(10), cell(11), cell(12)]], 3);
    const filled = grid([
      Array.from({ length: 25 }, (_, hour) => cell(hour, hour < 24)),
    ]);

    expect(buildDepthProfileView(short, "absolute").changes24h[0].delta).toBeNull();
    expect(buildDepthProfileView(filled, "absolute").changes24h[0].delta).toBeNull();
  });
});

describe("getDefaultDepthProfileMode", () => {
  const profile = (ramp: DepthProfile["ramp"]): DepthProfile => ({
    key: ramp,
    ramp,
    bands: [],
  });

  it("opens moisture as development and temperature as absolute", () => {
    expect(getDefaultDepthProfileMode(profile("moisture"))).toBe("development");
    expect(getDefaultDepthProfileMode(profile("temperature"))).toBe("absolute");
  });
});
