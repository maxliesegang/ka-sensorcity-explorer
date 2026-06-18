import type { TemperatureInsightsData } from "../api/temperatureInsights";
import type { Sensor } from "../types";
import { isRecentlyMeasured } from "./sensorFreshness";
import type { TemperatureFieldPoint } from "./temperatureScale";

const TEMPERATURE_CATEGORY = "Temperatur";
const TEMPERATURE_FIELD = "temp";

export interface LiveTemperatureObservation {
  temperature: number;
  sensor: Sensor;
}

export type LiveTemperatureFieldPoint = TemperatureFieldPoint & { sensor: Sensor };

/** Extract fresh, finite-temperature live sensor observations. */
export function getLiveTemperatureObservations(
  sensors: readonly Sensor[],
  now = Date.now(),
): LiveTemperatureObservation[] {
  const observations: LiveTemperatureObservation[] = [];
  for (const sensor of sensors) {
    if (sensor.category !== TEMPERATURE_CATEGORY) continue;
    if (!isRecentlyMeasured(sensor, now)) continue;

    const temperature = Number(sensor.attributes[TEMPERATURE_FIELD]);
    if (!Number.isFinite(temperature)) continue;
    observations.push({ temperature, sensor });
  }
  return observations;
}

/** Extract fresh, finite-temperature, geolocated live sensors for the map. */
export function getLiveTemperatureFieldPoints(
  sensors: readonly Sensor[],
  now = Date.now(),
): LiveTemperatureFieldPoint[] {
  const points: LiveTemperatureFieldPoint[] = [];
  for (const { temperature, sensor } of getLiveTemperatureObservations(sensors, now)) {
    if (sensor.lat == null || sensor.lon == null) continue;
    points.push({ lat: sensor.lat, lon: sensor.lon, temperature, sensor });
  }
  return points;
}

/** Derive live comparison stats from already-filtered temperature observations. */
export function summarizeLiveTemperatureObservations(
  observations: readonly LiveTemperatureObservation[],
): TemperatureInsightsData["current"] {
  if (observations.length < 2) return null;

  let hottest = observations[0];
  let coldest = observations[0];
  let sum = 0;
  for (const observation of observations) {
    if (observation.temperature > hottest.temperature) hottest = observation;
    if (observation.temperature < coldest.temperature) coldest = observation;
    sum += observation.temperature;
  }

  return {
    min: coldest.temperature,
    max: hottest.temperature,
    spread: hottest.temperature - coldest.temperature,
    mean: sum / observations.length,
    hottest: {
      objectId: hottest.sensor.objectId,
      name: hottest.sensor.name,
      value: hottest.temperature,
    },
    coldest: {
      objectId: coldest.sensor.objectId,
      name: coldest.sensor.name,
      value: coldest.temperature,
    },
  };
}
