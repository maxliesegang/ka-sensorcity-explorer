import type { TemperatureInsightsData } from "../api/temperatureInsights";
import { TEMPERATURE_CATEGORY_KEY, TEMPERATURE_FIELD_KEY } from "../config/layers";
import type { Sensor } from "../types";
import { isRecentlyMeasured } from "./sensorFreshness";
import type { TemperatureFieldPoint } from "./temperatureScale";

export interface LiveTemperatureReading {
  temperature: number;
  sensor: Sensor;
}

export type LiveTemperatureFieldPoint = TemperatureFieldPoint & { sensor: Sensor };

/** Extract fresh, finite-temperature live sensor readings. */
export function getLiveTemperatureReadings(
  sensors: readonly Sensor[],
  now = Date.now(),
): LiveTemperatureReading[] {
  const readings: LiveTemperatureReading[] = [];
  for (const sensor of sensors) {
    if (sensor.category !== TEMPERATURE_CATEGORY_KEY) continue;
    if (!isRecentlyMeasured(sensor, now)) continue;

    const temperature = Number(sensor.attributes[TEMPERATURE_FIELD_KEY]);
    if (!Number.isFinite(temperature)) continue;
    readings.push({ temperature, sensor });
  }
  return readings;
}

/** Extract fresh, finite-temperature, geolocated live sensors for the map. */
export function getLiveTemperatureFieldPoints(
  sensors: readonly Sensor[],
  now = Date.now(),
): LiveTemperatureFieldPoint[] {
  const points: LiveTemperatureFieldPoint[] = [];
  for (const { temperature, sensor } of getLiveTemperatureReadings(sensors, now)) {
    if (sensor.lat == null || sensor.lon == null) continue;
    points.push({ lat: sensor.lat, lon: sensor.lon, temperature, sensor });
  }
  return points;
}

/** Derive live comparison stats from already-filtered temperature readings. */
export function summarizeLiveTemperatureReadings(
  readings: readonly LiveTemperatureReading[],
): TemperatureInsightsData["current"] {
  if (readings.length < 2) return null;

  let hottest = readings[0];
  let coldest = readings[0];
  let sum = 0;
  for (const reading of readings) {
    if (reading.temperature > hottest.temperature) hottest = reading;
    if (reading.temperature < coldest.temperature) coldest = reading;
    sum += reading.temperature;
  }

  return {
    min: coldest.temperature,
    max: hottest.temperature,
    spread: hottest.temperature - coldest.temperature,
    mean: sum / readings.length,
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
