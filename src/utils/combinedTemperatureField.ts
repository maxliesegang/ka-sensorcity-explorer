// Merge SensorCity live temperature points with community readings (openSenseMap,
// sensor.community, …) into one geolocated set for the combined live field.

import type { LiveTemperatureFieldPoint } from "./liveTemperatureObservations";
import type { TemperatureFieldPoint } from "./temperatureScale";

export type CombinedTemperatureSource =
  | "sensorcity"
  | "opensensemap"
  | "sensorcommunity";

// Plausible outdoor air-temperature bounds (°C). Citizen sensors occasionally
// emit hardware-fault spikes (e.g. a broken BME280 reading -142 °C); anything
// outside this range is dropped so one faulty device can't blow out the colour
// scale and swamp the whole field.
export const MIN_PLAUSIBLE_TEMPERATURE_C = -40;
export const MAX_PLAUSIBLE_TEMPERATURE_C = 55;

/** True for a finite air temperature within the plausible outdoor range. */
export function isPlausibleAirTemperature(temperature: number): boolean {
  return (
    Number.isFinite(temperature) &&
    temperature >= MIN_PLAUSIBLE_TEMPERATURE_C &&
    temperature <= MAX_PLAUSIBLE_TEMPERATURE_C
  );
}

/** A geolocated reading from an external (non-SensorCity) community network. */
export interface ExternalTemperatureReading {
  id: string;
  name: string;
  lat: number;
  lon: number;
  temperature: number;
  measuredAt: number;
}

/** One external network to fold into the field. */
export interface ExternalTemperatureSource {
  source: CombinedTemperatureSource;
  /** Prefix keeping ids unique across sources, e.g. "osm" / "sc". */
  idPrefix: string;
  readings: readonly ExternalTemperatureReading[];
  /** Optional per-sensor external page builder, when the network has one. */
  hrefFor?: (id: string) => string;
}

/**
 * A temperature point on the combined field, tagged with its source and the
 * metadata the map popups/markers need. `id` is unique across all sources (the
 * source prefix is part of it) so it can drive the baseline selection.
 */
export interface CombinedTemperaturePoint extends TemperatureFieldPoint {
  id: string;
  name: string;
  source: CombinedTemperatureSource;
  /** Epoch ms of the reading, for the popup's "reading time" line. */
  measuredAt: number | null;
  /** Internal SensorCity detail route (hash), when this is a city sensor. */
  detailHref?: string;
  /** External community page, when the source exposes one. */
  externalHref?: string;
}

/** Combine SensorCity points with any number of external community sources. */
export function combineTemperaturePoints(
  sensorCity: readonly LiveTemperatureFieldPoint[],
  externals: readonly ExternalTemperatureSource[],
): CombinedTemperaturePoint[] {
  const points: CombinedTemperaturePoint[] = sensorCity.map((point) => ({
    lat: point.lat,
    lon: point.lon,
    temperature: point.temperature,
    id: `ka:${point.sensor.objectId}`,
    name: point.sensor.name,
    source: "sensorcity",
    measuredAt: point.sensor.measuredAt,
    detailHref: `#/sensor/${point.sensor.objectId}`,
  }));

  for (const { source, idPrefix, readings, hrefFor } of externals) {
    for (const reading of readings) {
      points.push({
        lat: reading.lat,
        lon: reading.lon,
        temperature: reading.temperature,
        id: `${idPrefix}:${reading.id}`,
        name: reading.name,
        source,
        measuredAt: reading.measuredAt,
        externalHref: hrefFor?.(reading.id),
      });
    }
  }

  return points;
}
