// Cross-sensor temperature insights, built on the domain client.
//
// Fetches the rolling temperature history for every live "Temperatur" sensor with a
// device id and derives how those sensors compare — right now (for fresh live
// readings only) and over time (per-bucket spread series, per-sensor volatility).

import { getCategory } from "../config/layers";
import type { Sensor } from "../types";
import { mapWithConcurrency } from "../utils/concurrency";
import { isRecentlyMeasured } from "../utils/sensorFreshness";
import { mean } from "../utils/stats";
import { fetchHistory, fetchSensors, type TimeSeriesPoint } from "./sensorcity";

export interface TemperatureSensorStats {
  objectId: number;
  name: string;
  current: number | null; // latest live reading (°C), null if unavailable
  min: number; // historical min over the rolling archive
  max: number; // historical max
  mean: number; // historical mean
  range: number; // max - min (a volatility proxy)
  deviationNow: number | null; // current - cityCurrentMean, null if current null
  sampleCount: number; // number of history points used
}

export interface TemperatureSpreadPoint {
  timestamp: number; // bucket-start epoch ms
  min: number; // coldest sensor's value in this time bucket
  max: number; // warmest sensor's value in this time bucket
  spread: number; // max - min (how thermally divided the city was)
  mean: number; // mean across sensors in this bucket
  sensorCount: number; // sensors contributing to this bucket
}

export interface ArchivedTemperatureFieldPoint {
  objectId: number;
  name: string;
  lat: number;
  lon: number;
  temperature: number;
}

export interface TemperatureFieldSnapshot {
  timestamp: number; // bucket-start epoch ms
  points: ArchivedTemperatureFieldPoint[]; // geolocated sensor temperatures in this time bucket
}

export interface TemperatureInsightsData {
  sensorCount: number; // temperature sensors with usable data
  generatedAt: number; // Date.now() at fetch time
  current: {
    min: number;
    max: number;
    spread: number;
    mean: number;
    hottest: { objectId: number; name: string; value: number };
    coldest: { objectId: number; name: string; value: number };
  } | null; // null if fewer than 2 sensors report a current temperature
  perSensor: TemperatureSensorStats[]; // sorted by `current` DESC (nulls last)
  mostVolatile: TemperatureSensorStats | null; // sensor with the largest historical `range`
  spreadSeries: TemperatureSpreadPoint[]; // oldest -> newest; only buckets with sensorCount >= 2
  fieldSnapshots: TemperatureFieldSnapshot[]; // oldest -> newest; frames for historical Voronoi replay
  bucketHours: number; // bucket width used for spreadSeries
}

const TEMPERATURE_CATEGORY = "Temperatur";
const TEMPERATURE_FIELD = "temp";
const BUCKET_HOURS = 1;
const CONCURRENCY = 6;

const EMPTY_INSIGHTS = (): TemperatureInsightsData => ({
  sensorCount: 0,
  generatedAt: Date.now(),
  current: null,
  perSensor: [],
  mostVolatile: null,
  spreadSeries: [],
  fieldSnapshots: [],
  bucketHours: BUCKET_HOURS,
});

/** Fresh live temperature for a sensor, or null when stale / not finite. */
function currentTemperature(sensor: Sensor, now: number): number | null {
  if (!isRecentlyMeasured(sensor, now)) return null;
  const value = Number(sensor.attributes[TEMPERATURE_FIELD]);
  return Number.isFinite(value) ? value : null;
}

/** Collapse raw points into per-bucket means keyed by bucket-start epoch ms. */
function bucketMeans(points: TimeSeriesPoint[], bucketMs: number): Map<number, number> {
  const sums = new Map<number, { sum: number; n: number }>();
  for (const point of points) {
    const key = Math.floor(point.timestamp / bucketMs) * bucketMs;
    const bucket = sums.get(key);
    if (bucket) {
      bucket.sum += point.value;
      bucket.n += 1;
    } else {
      sums.set(key, { sum: point.value, n: 1 });
    }
  }
  const means = new Map<number, number>();
  for (const [key, { sum, n }] of sums) means.set(key, sum / n);
  return means;
}

function buildPerSensorStats(
  sensors: Sensor[],
  histories: TimeSeriesPoint[][],
  currents: Array<number | null>,
  cityCurrentMean: number | null,
): TemperatureSensorStats[] {
  const perSensor = sensors.map((sensor, i) => {
    const current = currents[i];
    const points = histories[i];
    let min: number;
    let max: number;
    let meanValue: number;
    let range: number;

    if (points.length > 0) {
      min = points[0].value;
      max = points[0].value;
      let sum = 0;
      for (const point of points) {
        if (point.value < min) min = point.value;
        if (point.value > max) max = point.value;
        sum += point.value;
      }
      meanValue = sum / points.length;
      range = max - min;
    } else {
      const fallback = current ?? 0;
      min = fallback;
      max = fallback;
      meanValue = fallback;
      range = 0;
    }

    return {
      objectId: sensor.objectId,
      name: sensor.name,
      current,
      min,
      max,
      mean: meanValue,
      range,
      deviationNow:
        current != null && cityCurrentMean != null ? current - cityCurrentMean : null,
      sampleCount: points.length,
    };
  });

  // Sort by current DESC, nulls last.
  perSensor.sort((a, b) => {
    if (a.current == null) return b.current == null ? 0 : 1;
    if (b.current == null) return -1;
    return b.current - a.current;
  });
  return perSensor;
}

function mostVolatileSensor(stats: TemperatureSensorStats[]): TemperatureSensorStats | null {
  let mostVolatile: TemperatureSensorStats | null = null;
  for (const stat of stats) {
    if (stat.sampleCount > 0 && (mostVolatile == null || stat.range > mostVolatile.range)) {
      mostVolatile = stat;
    }
  }
  return mostVolatile;
}

function buildCurrentComparison(
  sensors: Sensor[],
  currents: Array<number | null>,
  cityCurrentMean: number | null,
): TemperatureInsightsData["current"] {
  if (cityCurrentMean == null || currents.filter((c) => c != null).length < 2) {
    return null;
  }

  let hottest = { objectId: 0, name: "", value: -Infinity };
  let coldest = { objectId: 0, name: "", value: Infinity };
  for (let i = 0; i < sensors.length; i++) {
    const value = currents[i];
    if (value == null) continue;
    const sensor = sensors[i];
    if (value > hottest.value) {
      hottest = { objectId: sensor.objectId, name: sensor.name, value };
    }
    if (value < coldest.value) {
      coldest = { objectId: sensor.objectId, name: sensor.name, value };
    }
  }

  return {
    min: coldest.value,
    max: hottest.value,
    spread: hottest.value - coldest.value,
    mean: cityCurrentMean,
    hottest,
    coldest,
  };
}

function buildBucketedHistory(
  sensors: Sensor[],
  histories: TimeSeriesPoint[][],
  bucketMs: number,
): Pick<TemperatureInsightsData, "spreadSeries" | "fieldSnapshots"> {
  const perSensorBuckets = histories.map((points) => bucketMeans(points, bucketMs));
  const spreadBuckets = new Map<number, number[]>();
  const fieldBuckets = new Map<number, ArchivedTemperatureFieldPoint[]>();

  for (let i = 0; i < perSensorBuckets.length; i++) {
    const sensor = sensors[i];
    for (const [key, value] of perSensorBuckets[i]) {
      const values = spreadBuckets.get(key);
      if (values) values.push(value);
      else spreadBuckets.set(key, [value]);

      if (sensor.lat != null && sensor.lon != null) {
        const point: ArchivedTemperatureFieldPoint = {
          objectId: sensor.objectId,
          name: sensor.name,
          lat: sensor.lat,
          lon: sensor.lon,
          temperature: value,
        };
        const points = fieldBuckets.get(key);
        if (points) points.push(point);
        else fieldBuckets.set(key, [point]);
      }
    }
  }

  const spreadSeries: TemperatureSpreadPoint[] = [];
  for (const [timestamp, values] of spreadBuckets) {
    if (values.length < 2) continue;
    let min = values[0];
    let max = values[0];
    let sum = 0;
    for (const value of values) {
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
    }
    spreadSeries.push({
      timestamp,
      min,
      max,
      spread: max - min,
      mean: sum / values.length,
      sensorCount: values.length,
    });
  }
  spreadSeries.sort((a, b) => a.timestamp - b.timestamp);

  const fieldSnapshots: TemperatureFieldSnapshot[] = [];
  for (const [timestamp, points] of fieldBuckets) {
    if (points.length >= 2) fieldSnapshots.push({ timestamp, points });
  }
  fieldSnapshots.sort((a, b) => a.timestamp - b.timestamp);

  return { spreadSeries, fieldSnapshots };
}

/**
 * Fetch temperature history for all live "Temperatur" sensors with a device id.
 * Current comparisons use only fresh live readings, while historical stats and
 * map frames use the full retained archive returned by the service.
 */
export async function fetchTemperatureInsights(
  signal?: AbortSignal,
): Promise<TemperatureInsightsData> {
  const archiveLayerId = getCategory(TEMPERATURE_CATEGORY)?.archiveLayerId;
  const sensors = await fetchSensors(signal);
  const now = Date.now();
  const temperatureSensors = sensors.filter(
    (sensor) =>
      sensor.category === TEMPERATURE_CATEGORY &&
      sensor.deviceId !== "",
  );
  if (temperatureSensors.length === 0 || archiveLayerId == null) {
    return EMPTY_INSIGHTS();
  }

  // Pull each sensor's rolling history with bounded concurrency.
  const histories = await mapWithConcurrency(
    temperatureSensors,
    CONCURRENCY,
    (sensor) =>
      fetchHistory(archiveLayerId, sensor.deviceId, TEMPERATURE_FIELD, {}, signal),
  );

  const currents = temperatureSensors.map((sensor) => currentTemperature(sensor, now));
  const finiteCurrents = currents.filter((c): c is number => c != null);
  const cityCurrentMean = mean(finiteCurrents);
  const perSensor = buildPerSensorStats(
    temperatureSensors,
    histories,
    currents,
    cityCurrentMean,
  );
  const current = buildCurrentComparison(temperatureSensors, currents, cityCurrentMean);
  const mostVolatile = mostVolatileSensor(perSensor);
  const { spreadSeries, fieldSnapshots } = buildBucketedHistory(
    temperatureSensors,
    histories,
    BUCKET_HOURS * 3_600_000,
  );

  return {
    sensorCount: temperatureSensors.length,
    generatedAt: Date.now(),
    current,
    perSensor,
    mostVolatile,
    spreadSeries,
    fieldSnapshots,
    bucketHours: BUCKET_HOURS,
  };
}
