// Grid model for the depth-profile heatmap: archive rows → depth × time cells.
//
// Archive rows arrive at whatever cadence the probe reported, which is uneven
// and gappy. Plotting one column per row would stretch quiet stretches and
// squeeze busy ones, so the series is resampled onto evenly spaced time columns
// and averaged within each. That keeps the x-axis linear in time, and caps the
// cell count regardless of how much history is retained.
//
// The two subtleties are the column width (see CADENCE_HEADROOM) and what
// happens to a column no reading landed in (see MAX_INTERPOLATED_COLUMNS).

import type { HistoryRow } from "../api/sensorcity";
import type { DepthProfile } from "../types";

/** A time bucket; `from` inclusive, `to` exclusive (except the last column). */
export interface DepthProfileColumn {
  from: number;
  to: number;
}

/**
 * One cell of a band's row. Carries where its value came from, because the two
 * cases must not be presented as equally solid: a chart that colours them alike
 * without saying so is claiming readings the probe never took.
 */
export interface DepthProfileCell {
  /** The column's mean reading, or the value interpolated across a short gap. */
  value: number;
  /**
   * True where no reading landed in this column and `value` was interpolated
   * from the nearest reported columns either side.
   */
  isInterpolated: boolean;
}

/** One depth band's row of cells, parallel to {@link DepthProfileGrid.columns}. */
export interface DepthProfileBandRow {
  field: string;
  band: number;
  /** Null only where no value could be established at all — see
   * {@link MAX_INTERPOLATED_COLUMNS}. */
  cells: (DepthProfileCell | null)[];
}

export interface DepthProfileGrid {
  /** Evenly spaced in time, ascending. */
  columns: DepthProfileColumn[];
  /** Every band the profile declares, shallow→deep — including any with no
   * readings, so the depth axis stays true to the probe's configuration. */
  bands: DepthProfileBandRow[];
  from: number;
  to: number;
  /** Value range across all cells, for the colour scale. */
  min: number;
  max: number;
  /** Number of archive rows behind the grid. */
  rowCount: number;
}

/** Upper bound on columns: dense enough to read, small enough to stay light. */
const DEFAULT_COLUMNS = 180;

/**
 * How much wider than the probe's own reporting cadence a column must be.
 *
 * Columns exactly as wide as the cadence look right and are a trap: readings
 * jitter around their nominal interval, so some columns catch two and others
 * none, and the empty ones render as outages that never happened. Widening the
 * bucket past the cadence absorbs the jitter. Real gaps are far longer than
 * this and still read as gaps.
 */
const CADENCE_HEADROOM = 1.25;

/**
 * The widest run of empty columns still bridged by interpolation.
 *
 * A probe that misses a couple of reports has not stopped measuring, but drawing
 * those columns as absence puts a bar through the middle of the heatmap, and the
 * eye cannot carry a trend across it — which is the one thing a depth profile is
 * read for. Interpolating a short dropout restores the comparison, and the value
 * either side genuinely does constrain what was missed.
 *
 * A long outage constrains nothing: the probe could have done anything for a
 * week, and a smooth ramp across it would be a fabrication the colour presents
 * as data. Those stay empty and read as the outages they are. Columns are the
 * unit rather than hours because a column is never narrower than the probe's own
 * cadence (see {@link CADENCE_HEADROOM}), so this is a bound on missed reports.
 */
const MAX_INTERPOLATED_COLUMNS = 4;

/** Median gap between consecutive rows — the probe's reporting cadence. */
function medianInterval(rows: readonly HistoryRow[]): number {
  if (rows.length < 2) return 0;
  // Sorted here rather than trusted: the grid is otherwise order-independent.
  const timestamps = rows.map((row) => row.timestamp).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push(timestamps[i] - timestamps[i - 1]);
  }
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  // The median, not the mean: a single multi-day outage must not stretch the
  // estimate and coarsen the whole grid.
  return gaps.length % 2 === 0 ? (gaps[mid - 1] + gaps[mid]) / 2 : gaps[mid];
}

/** How many columns `span` supports without cutting finer than the cadence. */
function cadenceColumns(rows: readonly HistoryRow[], span: number): number {
  const cadence = medianInterval(rows);
  if (cadence <= 0) return rows.length;
  return Math.max(1, Math.floor(span / (cadence * CADENCE_HEADROOM)));
}

/**
 * One band's column means turned into cells, bridging short gaps by linear
 * interpolation in time.
 *
 * A gap is only bridged when it is reported on *both* sides and no wider than
 * {@link MAX_INTERPOLATED_COLUMNS}. A leading or trailing gap therefore never is
 * — extrapolating past the ends of the series would be invention, not inference.
 */
function buildCells(means: readonly (number | null)[]): (DepthProfileCell | null)[] {
  const cells: (DepthProfileCell | null)[] = means.map((value) =>
    value == null ? null : { value, isInterpolated: false },
  );

  let previous = -1;
  for (let index = 0; index < means.length; index++) {
    const end = means[index];
    if (end == null) continue;
    const width = index - previous - 1;
    const start = previous >= 0 ? means[previous] : null;
    if (start != null && width > 0 && width <= MAX_INTERPOLATED_COLUMNS) {
      for (let step = 1; step <= width; step++) {
        cells[previous + step] = {
          value: start + ((end - start) * step) / (width + 1),
          isInterpolated: true,
        };
      }
    }
    previous = index;
  }

  return cells;
}

/**
 * Resample `rows` onto a depth × time grid. `rows[].values` must be parallel to
 * `profile.bands` — i.e. fetched with `profile.bands.map((b) => b.field)`.
 *
 * Returns null when there is nothing to draw: no rows, or no band carrying a
 * single reading.
 */
export function buildDepthProfileGrid(
  rows: readonly HistoryRow[],
  profile: DepthProfile,
  options: { columns?: number } = {},
): DepthProfileGrid | null {
  if (rows.length === 0 || profile.bands.length === 0) return null;

  let from = Infinity;
  let to = -Infinity;
  for (const row of rows) {
    if (row.timestamp < from) from = row.timestamp;
    if (row.timestamp > to) to = row.timestamp;
  }

  const span = to - from;
  // A single instant (or several at one timestamp) has no time axis to spread.
  const columnCount = span > 0
    ? Math.max(1, Math.min(options.columns ?? DEFAULT_COLUMNS, cadenceColumns(rows, span)))
    : 1;
  const step = span > 0 ? span / columnCount : 0;

  const sums = profile.bands.map(() => new Float64Array(columnCount));
  const counts = profile.bands.map(() => new Uint32Array(columnCount));

  for (const row of rows) {
    // The last column is closed so the newest reading lands inside the grid.
    const column = span > 0
      ? Math.min(columnCount - 1, Math.floor((row.timestamp - from) / step))
      : 0;
    profile.bands.forEach((_, band) => {
      const value = row.values[band];
      if (value == null) return;
      sums[band][column] += value;
      counts[band][column] += 1;
    });
  }

  // The range comes from the measured means alone. Interpolated values need no
  // say in it: each lies between the two readings it was drawn from, so it is
  // already inside the range they set.
  let min = Infinity;
  let max = -Infinity;
  const bands: DepthProfileBandRow[] = profile.bands.map((band, index) => {
    const means = Array.from({ length: columnCount }, (_, column) => {
      const count = counts[index][column];
      if (count === 0) return null;
      const mean = sums[index][column] / count;
      if (mean < min) min = mean;
      if (mean > max) max = mean;
      return mean;
    });
    return { field: band.field, band: band.band, cells: buildCells(means) };
  });

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  const columns: DepthProfileColumn[] = Array.from(
    { length: columnCount },
    (_, index) => ({
      from: from + index * step,
      to: span > 0 ? from + (index + 1) * step : to,
    }),
  );

  return { columns, bands, from, to, min, max, rowCount: rows.length };
}
