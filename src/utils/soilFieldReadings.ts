// Live soil-probe readings, shaped for the soil field map.
//
// A soil probe reports one quantity at several stacked depths at once, so the
// unit of data here is a *probe* carrying a value per band (shallow→deep,
// parallel to the profile's `bands`) rather than a single reading. The map draws
// one band at a time — `getSoilFieldPoints` — while the popup, the per-band
// summary and the shared colour scale all read the whole column, which is why
// the band values travel together instead of being re-extracted per band.

import { getCategory, SOIL_CATEGORY_KEY } from "../config/layers";
import type { DepthProfile, DepthProfileRamp, Sensor } from "../types";
import type { FieldPoint } from "./fieldPoint";
import { isRecentlyMeasured } from "./sensorFreshness";
import { getDepthProfiles, getReading } from "./sensorMeasurements";
import { median } from "./stats";

/**
 * Lowest value each quantity can plausibly report, exclusive.
 *
 * The probes publish a not-connected sentinel rather than null on a band they
 * cannot read: -328 °C (below absolute zero) and -5 % moisture. Bands 6–7 are
 * excluded upstream in `config/layers.ts` because *every* probe sentinels there,
 * but a single probe can sentinel on any band, and one such value would drag the
 * whole city's colour scale to an end. Genuine slightly-negative moisture
 * readings (calibration noise around zero) stay in: they are real, and the scale
 * clamps them.
 */
const VALUE_FLOOR: Record<DepthProfileRamp, number> = {
  temperature: -50,
  moisture: -5,
};

/** True when a raw band value is a reading rather than a not-connected sentinel. */
export function isUsableSoilValue(
  ramp: DepthProfileRamp,
  value: number | null,
): value is number {
  return value != null && value > VALUE_FLOOR[ramp];
}

/** The banded quantities the soil field can draw, straight from the data model. */
export function getSoilProfiles(): DepthProfile[] {
  return getDepthProfiles(getCategory(SOIL_CATEGORY_KEY));
}

/** One soil profile by key (`soil_temperature`, `soil_moisture`). */
export function getSoilProfile(key: string): DepthProfile | undefined {
  return getSoilProfiles().find((profile) => profile.key === key);
}

/** One probe's current column of readings for a single quantity. */
export interface SoilProbeReading extends FieldPoint {
  sensor: Sensor;
  /** Value per band, parallel to the profile's `bands`; null where unusable. */
  bandValues: (number | null)[];
}

/** A probe placed on the map for one selected band. */
export interface SoilFieldPoint extends SoilProbeReading {
  /** The selected band's value — what the cell's colour and label show. */
  value: number;
}

/**
 * Fresh, geolocated soil probes with their band column for `profile`. Probes
 * with no usable band at all are dropped: they have nothing to draw at any
 * depth, so they would only widen the map's extent.
 */
export function getSoilProbeReadings(
  sensors: readonly Sensor[],
  profile: DepthProfile,
  now = Date.now(),
): SoilProbeReading[] {
  const probes: SoilProbeReading[] = [];
  for (const sensor of sensors) {
    if (sensor.category !== SOIL_CATEGORY_KEY) continue;
    if (!isRecentlyMeasured(sensor, now)) continue;
    if (sensor.lat == null || sensor.lon == null) continue;

    const bandValues = profile.bands.map((band) => {
      const value = getReading(sensor, band.field);
      return isUsableSoilValue(profile.ramp, value) ? value : null;
    });
    if (!bandValues.some((value) => value != null)) continue;

    probes.push({ lat: sensor.lat, lon: sensor.lon, sensor, bandValues });
  }
  return probes;
}

/** The probes that report `bandIndex`, as map points coloured by that band. */
export function getSoilFieldPoints(
  probes: readonly SoilProbeReading[],
  bandIndex: number,
): SoilFieldPoint[] {
  const points: SoilFieldPoint[] = [];
  for (const probe of probes) {
    const value = probe.bandValues[bandIndex];
    if (value == null) continue;
    points.push({ ...probe, value });
  }
  return points;
}

/**
 * Every usable value across every band, which is the domain the colour scale
 * spans. One scale over all bands is what makes switching band a comparison
 * rather than a re-normalisation.
 */
export function getSoilFieldValues(probes: readonly SoilProbeReading[]): number[] {
  return probes.flatMap((probe) =>
    probe.bandValues.filter((value): value is number => value != null),
  );
}

/** Live spread of one band across the city. */
export interface SoilBandStats {
  /** Position in the profile's `bands`, i.e. the index the map selects by. */
  bandIndex: number;
  /** The band's ordinal depth rank (0 = shallowest), for labelling. */
  band: number;
  /** Probes reporting this band. */
  count: number;
  min: number;
  median: number;
  max: number;
}

/**
 * Per-band city-wide spread, shallow→deep. Bands no probe reports are omitted
 * rather than shown as zeroes — the feed declares bands it does not fill.
 */
export function getSoilBandStats(
  probes: readonly SoilProbeReading[],
  profile: DepthProfile,
): SoilBandStats[] {
  return profile.bands.flatMap((band, bandIndex) => {
    const values = probes.flatMap((probe) => {
      const value = probe.bandValues[bandIndex];
      return value != null ? [value] : [];
    });
    const middle = median(values);
    if (middle == null) return [];
    return [
      {
        bandIndex,
        band: band.band,
        count: values.length,
        min: Math.min(...values),
        median: middle,
        max: Math.max(...values),
      },
    ];
  });
}
