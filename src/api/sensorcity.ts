// SensorCity-specific data access, built on the generic ArcGIS client.

import { LIVE_LAYER_ID } from "../config/layers";
import { isDemoMode, loadDemoApi } from "../demo/mode";
import type { Attributes, Feature, Sensor } from "../types";
import { query, queryAll, queryCount, queryStatistics } from "./arcgis";

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Normalize a live-layer feature into a UI-friendly Sensor. */
function toSensor(feature: Feature): Sensor {
  const attributes = feature.attributes;
  return {
    objectId: Number(attributes.objectid),
    deviceId: String(attributes.device_id ?? ""),
    name: String(attributes.name ?? "Unnamed sensor"),
    category: String(attributes.beschreibung ?? "Unknown"),
    description: String(attributes.beschreibung ?? ""),
    lat: toFiniteNumber(attributes.lat) ?? (feature.geometry ? feature.geometry.y : null),
    lon: toFiniteNumber(attributes.lon) ?? (feature.geometry ? feature.geometry.x : null),
    measuredAt: toFiniteNumber(attributes.measured_at),
    attributes,
  };
}

/** Fetch all live sensors with their current readings and locations. */
export async function fetchSensors(signal?: AbortSignal): Promise<Sensor[]> {
  const features = await queryAll(
    LIVE_LAYER_ID,
    { outFields: "*", returnGeometry: true },
    { maxRows: 5000 },
    signal,
  );
  return features.map(toSensor).sort((a, b) => a.name.localeCompare(b.name));
}

/** Fetch a single sensor by object id. */
export async function fetchSensor(
  objectId: number,
  signal?: AbortSignal,
): Promise<Sensor | null> {
  const res = await query(
    LIVE_LAYER_ID,
    { where: `objectid=${objectId}`, outFields: "*", returnGeometry: true },
    signal,
  );
  const feature = res.features[0];
  return feature ? toSensor(feature) : null;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

/**
 * Fetch a measurement's history for one sensor (by device_id) from an archive
 * layer, ordered oldest→newest. By default this pulls the full available
 * rolling archive; callers may pass `maxRows` if they need a smaller sample.
 */
export async function fetchHistory(
  archiveLayerId: number,
  deviceId: string,
  field: string,
  options: { maxRows?: number } = {},
  signal?: AbortSignal,
): Promise<TimeSeriesPoint[]> {
  if (isDemoMode()) return (await loadDemoApi()).history(archiveLayerId, deviceId, field);
  const features = await queryAll(
    archiveLayerId,
    {
      where: `device_id='${deviceId.replace(/'/g, "''")}'`,
      outFields: `measured_at,${field}`,
      orderByFields: "measured_at ASC",
    },
    { maxRows: options.maxRows },
    signal,
  );
  const points: TimeSeriesPoint[] = [];
  for (const feature of features) {
    const timestamp = toFiniteNumber(feature.attributes.measured_at);
    const value = toFiniteNumber(feature.attributes[field]);
    if (timestamp != null && value != null) points.push({ timestamp, value });
  }
  return points;
}

/** Row count of a layer. */
export const fetchLayerCount = queryCount;

export interface CategoryCount {
  category: string;
  count: number;
}

/** Count of live sensors grouped by category (`beschreibung`). */
export async function fetchCategoryCounts(
  signal?: AbortSignal,
): Promise<CategoryCount[]> {
  const features = await queryStatistics(
    LIVE_LAYER_ID,
    [{ statisticType: "count", onStatisticField: "objectid", outStatisticFieldName: "cnt" }],
    { groupByFieldsForStatistics: "beschreibung" },
    signal,
  );
  return features
    .map((f: Feature) => ({
      category: String((f.attributes as Attributes).beschreibung ?? "Unknown"),
      count: Number((f.attributes as Attributes).cnt ?? 0),
    }))
    .sort((a, b) => b.count - a.count);
}
