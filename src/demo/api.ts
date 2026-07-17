// Demo-mode data access: answers the same calls as the live API layer, but from
// the frozen snapshot. The api/* modules delegate here when `isDemoMode()`.
// Functions mirror their live counterparts and are reached through the module
// namespace (`(await loadDemoApi()).query(…)`), so they carry no `demo` prefix.
//
// The ArcGIS side is served by a deliberately small `/query` interpreter over
// the captured live-layer features — enough for the queries the app and the
// query explorer actually issue (equality / comparison filters, ordering,
// paging, and count-by-field statistics). Unsupported predicates fall back to
// matching all rows: this is a best-effort offline mirror, not a SQL engine.

import type { DwdHourlyPoint } from "../api/brightsky";
import type { OutStatistic, QueryParams } from "../api/arcgis";
import { LIVE_LAYER_ID } from "../config/layers";
import type { HistoryRow, TimeSeriesPoint } from "../api/sensorcity";
import type { Attributes, Feature, FieldInfo, QueryResponse } from "../types";
import { loadSnapshot } from "./snapshot";

// --- ArcGIS FeatureServer ---------------------------------------------------

/**
 * Source features for a layer: the full live layer, or a recent raw sample for
 * an archive layer (archive history proper is served by `history`).
 */
async function featuresForLayer(layerId: number): Promise<Feature[]> {
  const snapshot = await loadSnapshot();
  if (layerId === LIVE_LAYER_ID) return snapshot.liveFeatures;
  return snapshot.rawArchiveFeatures[layerId] ?? [];
}

type Comparator = "=" | "<>" | ">=" | "<=" | ">" | "<";
const COMPARATORS: Comparator[] = ["<>", ">=", "<=", "=", ">", "<"];

/** Evaluate one `field op value` clause against a feature. */
function matchClause(attributes: Attributes, clause: string): boolean {
  const trimmed = clause.trim();
  if (trimmed === "1=1" || trimmed === "") return true;
  for (const op of COMPARATORS) {
    const idx = trimmed.indexOf(op);
    if (idx <= 0) continue;
    const field = trimmed.slice(0, idx).trim();
    const rawValue = trimmed.slice(idx + op.length).trim();
    const actual = attributes[field];
    const quoted = /^'(.*)'$/.exec(rawValue);
    if (quoted) {
      const expected = quoted[1].replace(/''/g, "'");
      const actualStr = actual == null ? "" : String(actual);
      return op === "<>" ? actualStr !== expected : actualStr === expected;
    }
    const expected = Number(rawValue);
    const actualNum = typeof actual === "number" ? actual : Number(actual);
    if (!Number.isFinite(expected) || !Number.isFinite(actualNum)) return false;
    switch (op) {
      case "=": return actualNum === expected;
      case "<>": return actualNum !== expected;
      case ">=": return actualNum >= expected;
      case "<=": return actualNum <= expected;
      case ">": return actualNum > expected;
      case "<": return actualNum < expected;
    }
  }
  // Unrecognized predicate: don't hide the data, just match everything.
  return true;
}

/** Apply an `AND`-joined WHERE clause (the only combinator the app uses). */
function matchWhere(attributes: Attributes, where: string | undefined): boolean {
  if (!where) return true;
  return where
    .split(/\s+AND\s+/i)
    .every((clause) => matchClause(attributes, clause));
}

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

/** Sort features by an ArcGIS `orderByFields` spec (`field [ASC|DESC], …`). */
function applyOrder(features: Feature[], orderByFields: string | undefined): Feature[] {
  if (!orderByFields) return features;
  const terms = orderByFields.split(",").map((term) => {
    const [field, dir] = term.trim().split(/\s+/);
    return { field, sign: dir?.toUpperCase() === "DESC" ? -1 : 1 };
  });
  return [...features].sort((a, b) => {
    for (const { field, sign } of terms) {
      const cmp = compareValues(a.attributes[field], b.attributes[field]);
      if (cmp !== 0) return cmp * sign;
    }
    return 0;
  });
}

function projectFields(feature: Feature, outFields: string | undefined): Feature {
  if (!outFields || outFields.trim() === "*") return feature;
  const wanted = outFields.split(",").map((f) => f.trim());
  const attributes: Attributes = {};
  for (const field of wanted) {
    if (field in feature.attributes) attributes[field] = feature.attributes[field];
  }
  return { attributes, geometry: feature.geometry };
}

function aggregate(features: Feature[], stat: OutStatistic): number {
  const values = features
    .map((f) => Number(f.attributes[stat.onStatisticField]))
    .filter((n) => Number.isFinite(n));
  switch (stat.statisticType) {
    case "count": return features.length;
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "min": return values.length ? Math.min(...values) : 0;
    case "max": return values.length ? Math.max(...values) : 0;
    case "avg": return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    default: return 0;
  }
}

/** Build `outStatistics` rows, optionally grouped by a single field. */
function runStatistics(
  features: Feature[],
  stats: OutStatistic[],
  groupBy: string | undefined,
): Feature[] {
  const groups = new Map<string, Feature[]>();
  if (groupBy) {
    for (const feature of features) {
      const key = String(feature.attributes[groupBy] ?? "");
      const bucket = groups.get(key);
      if (bucket) bucket.push(feature);
      else groups.set(key, [feature]);
    }
  } else {
    groups.set("", features);
  }
  const rows: Feature[] = [];
  for (const [key, members] of groups) {
    const attributes: Attributes = {};
    if (groupBy) attributes[groupBy] = key;
    for (const stat of stats) {
      attributes[stat.outStatisticFieldName] = aggregate(members, stat);
    }
    rows.push({ attributes });
  }
  return rows;
}

export async function query(
  layerId: number,
  params: QueryParams,
): Promise<QueryResponse> {
  const all = await featuresForLayer(layerId);
  const matched = all.filter((f) => matchWhere(f.attributes, params.where));

  if (params.outStatistics) {
    return {
      features: runStatistics(matched, params.outStatistics, params.groupByFieldsForStatistics),
    };
  }

  const ordered = applyOrder(matched, params.orderByFields ?? "objectid ASC");
  const offset = params.resultOffset ?? 0;
  const count = params.resultRecordCount ?? ordered.length;
  const page = ordered.slice(offset, offset + count);
  const withGeometry = params.returnGeometry
    ? page
    : page.map((f) => ({ attributes: f.attributes }));
  return {
    features: withGeometry.map((f) => projectFields(f, params.outFields)),
    exceededTransferLimit: offset + page.length < ordered.length,
  };
}

export async function count(layerId: number, where: string): Promise<number> {
  if (layerId === LIVE_LAYER_ID || (where && where !== "1=1")) {
    const all = await featuresForLayer(layerId);
    return all.filter((f) => matchWhere(f.attributes, where)).length;
  }
  const snapshot = await loadSnapshot();
  return snapshot.counts[layerId] ?? 0;
}

export async function layerFields(layerId: number): Promise<FieldInfo[]> {
  const snapshot = await loadSnapshot();
  return snapshot.fields[layerId] ?? [];
}

export async function history(
  archiveLayerId: number,
  deviceId: string,
  field: string,
): Promise<TimeSeriesPoint[]> {
  const snapshot = await loadSnapshot();
  return snapshot.history[`${archiveLayerId}:${deviceId}:${field}`] ?? [];
}

/**
 * Multi-field history, rebuilt by joining the snapshot's per-field series on
 * their timestamps. The capture stores one series per measurement field, so the
 * columns of a row are reassembled here rather than stored a second time.
 */
export async function historyRows(
  archiveLayerId: number,
  deviceId: string,
  fields: readonly string[],
): Promise<HistoryRow[]> {
  const snapshot = await loadSnapshot();
  const byTimestamp = new Map<number, (number | null)[]>();
  fields.forEach((field, column) => {
    const series = snapshot.history[`${archiveLayerId}:${deviceId}:${field}`] ?? [];
    for (const point of series) {
      let values = byTimestamp.get(point.timestamp);
      if (!values) {
        values = fields.map(() => null);
        byTimestamp.set(point.timestamp, values);
      }
      values[column] = point.value;
    }
  });
  return [...byTimestamp]
    .sort(([a], [b]) => a - b)
    .map(([timestamp, values]) => ({ timestamp, values }));
}

// --- External providers -----------------------------------------------------

export async function pegelHistory(
  stationUuid: string,
  parameter: string,
): Promise<TimeSeriesPoint[]> {
  const snapshot = await loadSnapshot();
  return snapshot.pegel[`${stationUuid}:${parameter}`] ?? [];
}

export async function brightskyHourly(
  fromDate: Date,
  toDate: Date,
): Promise<DwdHourlyPoint[]> {
  const snapshot = await loadSnapshot();
  const from = fromDate.getTime();
  // Include the whole `toDate` calendar day, matching the live client's range.
  const to = toDate.getTime() + 24 * 60 * 60 * 1000;
  return snapshot.brightskyHourly.filter(
    (p) => p.timestamp >= from && p.timestamp < to,
  );
}

export async function brightskyCurrent(): Promise<DwdHourlyPoint | null> {
  const snapshot = await loadSnapshot();
  return snapshot.brightskyCurrent;
}
