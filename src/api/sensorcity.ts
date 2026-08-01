// SensorCity-specific data access, built on the generic ArcGIS client.

import {
  getCategory,
  LIVE_LAYER_ID,
  PRECIPITATION_FIELD_KEY,
  TEMPERATURE_CATEGORY_KEY,
} from "../config/layers";
import { isDemoMode, loadDemoApi } from "../demo/mode";
import type { Attributes, Feature, Sensor } from "../types";
import { toFiniteNumber } from "../utils/number";
import {
  summarizePrecipitation,
  type PrecipitationStatus,
} from "../utils/precipitation";
import { query, queryAll, queryCount, queryStatistics } from "./arcgis";

/** Normalize a live-layer feature into a UI-friendly Sensor. */
function toSensor(feature: Feature): Sensor {
  const attributes = feature.attributes;
  return {
    objectId: Number(attributes.objectid),
    deviceId: String(attributes.device_id ?? ""),
    name: String(attributes.name ?? "Unnamed sensor"),
    category: String(attributes.beschreibung ?? "Unknown"),
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

/** Options shared by the archive readers. */
interface HistoryOptions {
  /** Cap on rows pulled; omit for the full retained archive. */
  maxRows?: number;
}

/**
 * One device's archive rows, oldest→newest, carrying `fields` alongside the
 * timestamp. The single place a device id is escaped into a SQL `WHERE` clause.
 */
function fetchArchiveFeatures(
  archiveLayerId: number,
  deviceId: string,
  fields: readonly string[],
  options: HistoryOptions,
  signal?: AbortSignal,
): Promise<Feature[]> {
  return queryAll(
    archiveLayerId,
    {
      where: `device_id='${deviceId.replace(/'/g, "''")}'`,
      outFields: ["measured_at", ...fields].join(","),
      orderByFields: "measured_at ASC",
    },
    { maxRows: options.maxRows },
    signal,
  );
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
  options: HistoryOptions = {},
  signal?: AbortSignal,
): Promise<TimeSeriesPoint[]> {
  if (isDemoMode()) return (await loadDemoApi()).history(archiveLayerId, deviceId, field);
  const features = await fetchArchiveFeatures(archiveLayerId, deviceId, [field], options, signal);
  const points: TimeSeriesPoint[] = [];
  for (const feature of features) {
    const timestamp = toFiniteNumber(feature.attributes.measured_at);
    const value = toFiniteNumber(feature.attributes[field]);
    if (timestamp != null && value != null) points.push({ timestamp, value });
  }
  return points;
}

/** One archive row: a timestamp plus the requested fields' values. */
export interface HistoryRow {
  timestamp: number;
  /** Parallel to the requested `fields`; null where the row has no value. */
  values: (number | null)[];
}

/**
 * Fetch several measurements' history for one sensor in a single pass, ordered
 * oldest→newest. The multi-field counterpart of {@link fetchHistory}: reading a
 * whole depth profile this way costs one paginated scan of the archive instead
 * of one per band.
 */
export async function fetchHistoryRows(
  archiveLayerId: number,
  deviceId: string,
  fields: readonly string[],
  options: HistoryOptions = {},
  signal?: AbortSignal,
): Promise<HistoryRow[]> {
  if (fields.length === 0) return [];
  if (isDemoMode()) {
    return (await loadDemoApi()).historyRows(archiveLayerId, deviceId, fields);
  }
  const features = await fetchArchiveFeatures(archiveLayerId, deviceId, fields, options, signal);
  const rows: HistoryRow[] = [];
  for (const feature of features) {
    const timestamp = toFiniteNumber(feature.attributes.measured_at);
    if (timestamp == null) continue;
    const values = fields.map((field) => toFiniteNumber(feature.attributes[field]));
    // A row with no value in any requested field carries no information.
    if (values.some((value) => value != null)) rows.push({ timestamp, values });
  }
  return rows;
}

/** One hour of an archive layer, aggregated across every device that reported. */
export interface HourlyBucket {
  /** Hour start, epoch ms. */
  timestamp: number;
  mean: number;
  min: number;
  max: number;
  /** Archive rows behind this hour, across all devices. */
  sampleCount: number;
}

// The rain answer's shape and its counter arithmetic live in
// `utils/precipitation.ts` — pure, and shared with the demo mirror — but callers
// keep reaching for it here alongside the reader that produces it.
export type { PrecipitationStatus };

/** Render a Date as the `TIMESTAMP '…'` literal the service expects (UTC). */
function toSqlTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/**
 * Aggregate one archive field into hourly buckets **server-side**, across every
 * device on the layer — the whole-network counterpart of {@link fetchHistory},
 * at one request instead of one per device.
 *
 * The grouping is done by the service through two SQL expressions, which come
 * back positionally as `EXPR_1` (the day, as an epoch) and `EXPR_2` (the hour),
 * so the bucket start is their sum. Both the day and the hour are cut in UTC,
 * hence the UTC `since` literal.
 *
 * `field` is an upstream column name from `config/layers.ts`, never user input.
 */
export async function fetchHourlyBuckets(
  archiveLayerId: number,
  field: string,
  options: { since: Date },
  signal?: AbortSignal,
): Promise<HourlyBucket[]> {
  if (isDemoMode()) {
    return (await loadDemoApi()).hourlyBuckets(
      archiveLayerId,
      field,
      options.since.getTime(),
    );
  }
  const hourlyGroupBy = "CAST(measured_at AS DATE),EXTRACT(HOUR FROM measured_at)";
  const features = await queryStatistics(
    archiveLayerId,
    [
      { statisticType: "avg", onStatisticField: field, outStatisticFieldName: "mean_value" },
      { statisticType: "min", onStatisticField: field, outStatisticFieldName: "min_value" },
      { statisticType: "max", onStatisticField: field, outStatisticFieldName: "max_value" },
      { statisticType: "count", onStatisticField: field, outStatisticFieldName: "sample_count" },
    ],
    {
      where: `${field} IS NOT NULL AND measured_at >= TIMESTAMP '${toSqlTimestamp(options.since)}'`,
      groupByFieldsForStatistics: hourlyGroupBy,
      orderByFields: hourlyGroupBy,
    },
    signal,
  );

  const buckets: HourlyBucket[] = [];
  for (const feature of features) {
    const day = toFiniteNumber(feature.attributes.EXPR_1);
    const hour = toFiniteNumber(feature.attributes.EXPR_2);
    const mean = toFiniteNumber(feature.attributes.mean_value);
    const min = toFiniteNumber(feature.attributes.min_value);
    const max = toFiniteNumber(feature.attributes.max_value);
    if (day == null || hour == null || mean == null || min == null || max == null) {
      continue;
    }
    buckets.push({
      timestamp: day + hour * 3_600_000,
      mean,
      min,
      max,
      sampleCount: toFiniteNumber(feature.attributes.sample_count) ?? 0,
    });
  }
  return buckets.sort((a, b) => a.timestamp - b.timestamp);
}

/** How far back "is it raining right now" looks. */
export const PRECIPITATION_WINDOW_MS = 60 * 60 * 1000;

/**
 * Whether anything in the city has *actually* rained in the last hour, and at
 * how many of the stations that can currently answer the question.
 *
 * Precipitation lives on the weather *archive* only — the live layer has no
 * `niederschlag` column — so this is a second request rather than a read of the
 * sensors already loaded.
 *
 * The published value is a **cumulative tip counter, not an amount**: it holds
 * the same number for weeks and steps up only while rain falls, then wraps back
 * to a small number on a device reset. A station's reading being non-zero
 * therefore says nothing about today — this asks each station's rows in the
 * window how much the counter *rose* ({@link sumIncrements}), which is why the
 * rows are read individually rather than aggregated to one `max` per station.
 * At a ten-minute cadence that is a few hundred rows for the whole network.
 *
 * Only the wet/dry split and the station name are returned: the increments do
 * not behave like the millimetres the field is declared in, so quoting one as a
 * rainfall amount would assert more than the feed supports.
 */
async function fetchPrecipitationStatus(
  archiveLayerId: number,
  field: string,
  signal?: AbortSignal,
): Promise<PrecipitationStatus | null> {
  const since = new Date(Date.now() - PRECIPITATION_WINDOW_MS);
  if (isDemoMode()) {
    return (await loadDemoApi()).precipitationStatus(
      archiveLayerId,
      field,
      PRECIPITATION_WINDOW_MS,
    );
  }
  const features = await queryAll(
    archiveLayerId,
    {
      where: `${field} IS NOT NULL AND measured_at >= TIMESTAMP '${toSqlTimestamp(since)}'`,
      outFields: `device_id,name,measured_at,${field}`,
      orderByFields: "device_id ASC,measured_at ASC,objectid ASC",
    },
    { maxRows: 5000 },
    signal,
  );

  // Rows arrive grouped by station and in time order, so one pass builds each
  // station's series. Keyed by device id — the one id the archive and the live
  // layer share, so the station named below can be linked to its sensor page.
  const byStation = new Map<string, { name: string; values: number[] }>();
  for (const feature of features) {
    const value = toFiniteNumber(feature.attributes[field]);
    if (value == null) continue;
    const deviceId = String(feature.attributes.device_id ?? "");
    const series = byStation.get(deviceId);
    if (series) series.values.push(value);
    else {
      byStation.set(deviceId, {
        name: String(feature.attributes.name ?? ""),
        values: [value],
      });
    }
  }

  return summarizePrecipitation(byStation, since.getTime());
}

/**
 * The city's rain answer, with the layer and field resolved from the data model
 * rather than by the caller. Null when the weather category declares no archive
 * — the same silent-empty this layer already absorbs for a renamed upstream key,
 * kept here rather than in a view so there is one place that knows where
 * precipitation lives.
 */
export function fetchCityPrecipitationStatus(
  signal?: AbortSignal,
): Promise<PrecipitationStatus | null> {
  const archiveLayerId = getCategory(TEMPERATURE_CATEGORY_KEY)?.archiveLayerId;
  if (archiveLayerId == null) return Promise.resolve(null);
  return fetchPrecipitationStatus(archiveLayerId, PRECIPITATION_FIELD_KEY, signal);
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
