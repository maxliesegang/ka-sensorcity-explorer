// What the network says about the city *right now*, in the three terms a
// resident actually asks in: how warm is it, is it raining, how high is the
// water.
//
// The overview used to answer these with one arbitrary sensor's reading — the
// most recently reporting one — which reads as a city figure but is a single
// point. Everything here is therefore a summary over all reporting sensors of a
// kind, and each answer carries the count it rests on so the UI can say what it
// is speaking for.
//
// Pure, and derived from the live layer alone, so temperature and water cost
// the overview no extra request. Rain is the exception and lives in the API
// layer: the live layer carries no precipitation column at all.

import {
  getCategory,
  TEMPERATURE_CATEGORY_KEY,
  TEMPERATURE_FIELD_KEY,
  WATER_CATEGORY_KEY,
  WATER_LEVEL_FIELD_KEY,
} from "../config/layers";
import type { Measurement, Sensor } from "../types";
import { getReading } from "./sensorMeasurements";
import { isRecentlyMeasured } from "./sensorFreshness";
import { median } from "./stats";

/** One sensor named as the extreme of a summary, for a link and a caption. */
export interface NamedReading {
  objectId: number;
  name: string;
  value: number;
  measuredAt: number | null;
}

export interface TemperatureConditions {
  /** Typical reading — the median, so one miscalibrated probe can't set it. */
  median: number;
  min: number;
  max: number;
  count: number;
  warmest: NamedReading;
  coolest: NamedReading;
}

export interface WaterConditions {
  /**
   * Every gauge with a current level, in the order the sensors arrive (by name).
   *
   * Deliberately not ranked: the network's three gauges sit on the Rhine, the
   * Alb and the Pfinz, whose beds and scales have nothing to do with each other,
   * so a "highest" would name the Rhine every day and say nothing. Each river is
   * its own answer.
   */
  gauges: NamedReading[];
}

export interface CityConditions {
  temperature: TemperatureConditions | null;
  water: WaterConditions | null;
}

function toNamedReading(sensor: Sensor, value: number): NamedReading {
  return {
    objectId: sensor.objectId,
    name: sensor.name,
    value,
    measuredAt: sensor.measuredAt,
  };
}

/** One sensor's usable reading for the field being summarized. */
interface CategoryReading {
  sensor: Sensor;
  value: number;
}

/**
 * Collect one measurement across the sensors of a category, over their latest
 * readings. Empty when nothing in that category currently reports the field —
 * routine, since layers declare fields they never populate.
 *
 * A "right now" answer may only rest on readings from the last hour, except for
 * the categories whose config declares `reportsSlowly`: those take their latest
 * value whatever its age, and the UI shows how old it is.
 */
function summarizeReadings(
  sensors: readonly Sensor[],
  categoryKey: string,
  field: string,
  now = Date.now(),
): CategoryReading[] {
  const requireRecent = !getCategory(categoryKey)?.reportsSlowly;
  const readings: CategoryReading[] = [];
  for (const sensor of sensors) {
    if (sensor.category !== categoryKey) continue;
    if (requireRecent && !isRecentlyMeasured(sensor, now)) continue;
    const value = getReading(sensor, field);
    if (value == null) continue;
    readings.push({ sensor, value });
  }
  return readings;
}

/** The reading of `readings` scoring highest under `rank`, or null when empty. */
function extreme(
  readings: readonly CategoryReading[],
  rank: (candidate: number, best: number) => boolean,
): CategoryReading | null {
  let best: CategoryReading | null = null;
  for (const reading of readings) {
    if (best === null || rank(reading.value, best.value)) best = reading;
  }
  return best;
}

const HIGHEST = (candidate: number, best: number) => candidate > best;
const LOWEST = (candidate: number, best: number) => candidate < best;

/**
 * A category's current spread for one measurement, for the overview's category
 * cards: the typical reading plus the range it sits in and how many sensors it
 * speaks for. Null when the category has no usable readings.
 */
export function summarizeCategoryReadings(
  sensors: readonly Sensor[],
  categoryKey: string,
  measurement: Measurement | undefined,
  now = Date.now(),
): { median: number; min: number; max: number; count: number } | null {
  if (!measurement) return null;
  const readings = summarizeReadings(sensors, categoryKey, measurement.field, now);
  const values = readings.map((reading) => reading.value);
  const typical = median(values);
  if (typical == null) return null;
  return {
    median: typical,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
  };
}

function summarizeTemperature(
  sensors: readonly Sensor[],
  now: number,
): TemperatureConditions | null {
  const readings = summarizeReadings(
    sensors,
    TEMPERATURE_CATEGORY_KEY,
    TEMPERATURE_FIELD_KEY,
    now,
  );
  const typical = median(readings.map((reading) => reading.value));
  const warmest = extreme(readings, HIGHEST);
  const coolest = extreme(readings, LOWEST);
  if (typical == null || warmest == null || coolest == null) return null;

  return {
    median: typical,
    min: coolest.value,
    max: warmest.value,
    count: readings.length,
    warmest: toNamedReading(warmest.sensor, warmest.value),
    coolest: toNamedReading(coolest.sensor, coolest.value),
  };
}

function summarizeWater(sensors: readonly Sensor[], now: number): WaterConditions | null {
  // Gauges are declared `reportsSlowly`, so this takes the latest value whatever
  // its age; the UI shows how old it is.
  const readings = summarizeReadings(sensors, WATER_CATEGORY_KEY, WATER_LEVEL_FIELD_KEY, now);
  if (readings.length === 0) return null;

  return {
    gauges: readings.map((reading) => toNamedReading(reading.sensor, reading.value)),
  };
}

/**
 * The current-conditions answers the live layer can give, each null where
 * nothing reports it.
 *
 * Rain is deliberately absent: `niederschlag` exists on the weather *archive*
 * only, so that answer is a separate request (`fetchCityPrecipitationStatus`) rather
 * than a read of the sensors already loaded.
 */
export function getCityConditions(
  sensors: readonly Sensor[],
  now = Date.now(),
): CityConditions {
  return {
    temperature: summarizeTemperature(sensors, now),
    water: summarizeWater(sensors, now),
  };
}
