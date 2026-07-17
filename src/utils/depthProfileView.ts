// Presentation models derived from an absolute depth-profile grid.
//
// The archive grid remains the source of truth: it stores measured values and
// interpolation provenance. A view can then either use those values directly
// or centre every band on its own median so fixed differences between probe
// levels do not hide change over time.

import type { DepthProfile, DepthProfileRamp } from "../types";
import type {
  DepthProfileBandRow,
  DepthProfileCell,
  DepthProfileGrid,
} from "./depthProfile";

export const DEPTH_PROFILE_MODES = ["absolute", "development"] as const;
export type DepthProfileMode = (typeof DEPTH_PROFILE_MODES)[number];

/** Narrow the string emitted by form controls to a supported profile mode. */
export function isDepthProfileMode(value: string): value is DepthProfileMode {
  return DEPTH_PROFILE_MODES.some((mode) => mode === value);
}

export interface DepthProfileBandChange {
  field: string;
  band: number;
  /** Latest measured value minus the first measured value in the 24-hour window. */
  delta: number | null;
}

export interface DepthProfileView {
  /** Cells and range to render for the selected mode. */
  grid: DepthProfileGrid;
  /** Absolute change per band over the latest sufficiently complete 24-hour window. */
  changes24h: DepthProfileBandChange[];
}

const DAY = 24 * 60 * 60 * 1000;
// Do not label a short fragment as a 24-hour change. A little cadence jitter or
// one missing report is fine; a half-day archive is not.
const MIN_WINDOW_COVERAGE = 0.75;

/** Defaults by quantity semantics; adding a ramp requires an explicit choice. */
const DEFAULT_MODE: Record<DepthProfileRamp, DepthProfileMode> = {
  moisture: "development",
  temperature: "absolute",
};

export function getDefaultDepthProfileMode(
  profile: Pick<DepthProfile, "ramp">,
): DepthProfileMode {
  return DEFAULT_MODE[profile.ramp];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/** Median of actual bucket means only; filled-in cells must not set a baseline. */
function bandMedian(band: DepthProfileBandRow): number | null {
  const values = band.cells.flatMap((cell) =>
    cell != null && !cell.isInterpolated ? [cell.value] : [],
  );
  return values.length > 0 ? median(values) : null;
}

/**
 * Centre each band independently on its measured median. The resulting values
 * share one symmetric unit scale, so +3 percentage points means the same at
 * every depth while permanent per-band offsets disappear.
 */
function buildDevelopmentGrid(grid: DepthProfileGrid): DepthProfileGrid {
  let extent = 0;
  const bands = grid.bands.map((band) => {
    const baseline = bandMedian(band);
    const cells = band.cells.map((cell): DepthProfileCell | null => {
      if (cell == null || baseline == null) return null;
      const value = cell.value - baseline;
      // The colour domain, like the absolute grid's, is established by
      // reported values. Interpolation may fill a cell but must not decide how
      // strongly the measured series is coloured.
      if (!cell.isInterpolated) extent = Math.max(extent, Math.abs(value));
      return { value, isInterpolated: cell.isInterpolated };
    });
    return { ...band, cells };
  });

  return { ...grid, bands, min: -extent, max: extent };
}

function columnTime(grid: DepthProfileGrid, index: number): number {
  const column = grid.columns[index];
  return (column.from + column.to) / 2;
}

/** Change per band over the most recent window, ignoring interpolated values. */
function buildWindowChanges(
  grid: DepthProfileGrid,
  windowMs: number,
): DepthProfileBandChange[] {
  return grid.bands.map((band) => {
    const samples = band.cells.flatMap((cell, index) =>
      cell != null && !cell.isInterpolated
        ? [{ value: cell.value, time: columnTime(grid, index) }]
        : [],
    );
    const latest = samples.at(-1);
    if (latest == null) return { field: band.field, band: band.band, delta: null };

    const cutoff = latest.time - windowMs;
    const first = samples.find((sample) => sample.time >= cutoff);
    const coverage = first == null ? 0 : latest.time - first.time;
    const delta =
      first != null && coverage >= windowMs * MIN_WINDOW_COVERAGE
        ? latest.value - first.value
        : null;
    return { field: band.field, band: band.band, delta };
  });
}

export function buildDepthProfileView(
  grid: DepthProfileGrid,
  mode: DepthProfileMode,
): DepthProfileView {
  return {
    grid: mode === "development" ? buildDevelopmentGrid(grid) : grid,
    changes24h: buildWindowChanges(grid, DAY),
  };
}
