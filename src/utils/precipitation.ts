// Reading the rain gauges, whose published value is a *running total* rather
// than a measurement.
//
// `niederschlag` (like the rain writers' `clicks`) is a cumulative tip counter:
// it holds the same number for weeks and steps up only while rain falls, then
// wraps back to a small value on a device reset. Taking the reading itself as
// "how much rain" is wrong in both directions — a station that saw rain in June
// still publishes 244 through a dry August, and a reset makes a wet hour look
// like a drop. The only rain-bearing quantity in the series is how much it
// *rose*, which is what this module derives.
//
// Pure and DOM-free, and shared by the live reader and the demo mirror so the
// two can't drift into reading the counter differently.

/**
 * The station a rain answer names, identified well enough for the UI to link to
 * it: `deviceId` is the live layer's `device_id`, the only id the archive and
 * the live layer agree on (their `name`s differ in transliteration — the archive
 * writes "Thomashofstrasse" where the live layer writes "Thomashofstraße").
 */
export interface PrecipitationLeader {
  deviceId: string;
  /** The archive's own name, for when the live sensor can't be found. */
  name: string;
}

/** The city-wide rain answer: how many stations are wet, of those reporting. */
export interface PrecipitationStatus {
  /** Stations whose counter rose inside the window. */
  wet: number;
  /** Stations that reported often enough for a rise to be observable. */
  reporting: number;
  /** The station whose counter rose most, when any did. */
  wettest: PrecipitationLeader | null;
  /** Start of the window the answer covers (epoch ms). */
  since: number;
}

/** One station's readings inside the window, in time order. */
export interface StationSeries {
  name: string;
  values: readonly number[];
}

/**
 * How much a running counter increased across `values` (chronological order).
 *
 * Decreases are read as a device reset and contribute nothing rather than a
 * negative amount; readings after the reset still count on from there.
 */
export function sumIncrements(values: readonly number[]): number {
  let total = 0;
  for (let index = 1; index < values.length; index += 1) {
    const step = values[index] - values[index - 1];
    if (step > 0) total += step;
  }
  return total;
}

/** Whether a series is long enough for {@link sumIncrements} to mean anything. */
export function canObserveChange(values: readonly number[]): boolean {
  return values.length >= 2;
}

/**
 * The wet/dry answer over one window's counter series per station.
 *
 * Keyed by `device_id` rather than name: it is the id the archive and the live
 * layer agree on, so the wettest station can be linked to its sensor page.
 *
 * A station with a single reading in the window is left out of `reporting`
 * entirely: it is not dry, it is unanswerable, and counting it as dry would
 * quietly claim the opposite. Null when no station can answer at all.
 *
 * No amount is derived from the increments: they do not behave like the
 * millimetres the field is declared in, so the sum orders the stations and
 * nothing more.
 */
export function summarizePrecipitation(
  seriesByStation: ReadonlyMap<string, StationSeries>,
  since: number,
): PrecipitationStatus | null {
  let reporting = 0;
  let wet = 0;
  let wettest: PrecipitationLeader | null = null;
  let wettestIncrease = 0;

  for (const [deviceId, series] of seriesByStation) {
    if (!canObserveChange(series.values)) continue;
    reporting += 1;
    const increase = sumIncrements(series.values);
    if (increase <= 0) continue;
    wet += 1;
    if (increase > wettestIncrease) {
      wettestIncrease = increase;
      wettest = { deviceId, name: series.name };
    }
  }

  if (reporting === 0) return null;
  return { wet, reporting, wettest, since };
}
