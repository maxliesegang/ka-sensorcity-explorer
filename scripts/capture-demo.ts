// Capture a real snapshot of every API the app reads, so the explorer can run
// from a frozen dataset when the upstream services are unavailable (demo mode).
//
// Run with `npm run capture:demo`. It writes `public/demo-snapshot.json.gz`, which
// `src/demo/` serves whenever demo mode is on. Re-run it to refresh the dataset.
//
// Config (layers, fields, fallback sources) is imported from `src/` so this
// stays in sync with the live data model — there is nothing to duplicate here.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { CATEGORIES, LAYERS, LIVE_LAYER_ID } from "../src/config/layers.ts";
import { FALLBACK_HISTORY_SOURCES } from "../src/config/historySources.ts";
import {
  ARCGIS_MAX_PAGE_SIZE,
  BRIGHTSKY_BASE_URL,
  DWD_RHEINSTETTEN_STATION_ID,
  HVZ_WATER_LEVEL_LAYER_URL,
  SENSORCITY_FEATURE_SERVER_URL,
} from "../src/config/endpoints.ts";
import type { DemoSnapshot } from "../src/demo/snapshot.ts";
import type { Feature, FieldInfo } from "../src/types.ts";
import { mapWithConcurrency } from "../src/utils/concurrency.ts";

// By default the full retained archive is captured (matching what the live app
// fetches per sensor). Set `DEMO_HISTORY_MAX_ROWS=N` to cap each archive layer
// scan to its N most-recent rows if a smaller snapshot is needed.
const HISTORY_MAX_ROWS = process.env.DEMO_HISTORY_MAX_ROWS
  ? Number(process.env.DEMO_HISTORY_MAX_ROWS)
  : Infinity;
// Most-recent raw archive rows kept per archive layer so the query explorer
// (and any raw query) returns real data for layers 2-5 in demo mode.
const RAW_SAMPLE_ROWS = Number(process.env.DEMO_RAW_SAMPLE_ROWS ?? 2000);
// Minimum window (days) for the DWD weather baseline. The actual window is
// extended back to the oldest captured reading so the historical temperature
// replay always has a baseline for every frame (slow sensors can reach weeks).
const WEATHER_MIN_DAYS = Number(process.env.DEMO_WEATHER_DAYS ?? 14);
const CONCURRENCY = 6;

interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const body = (await res.json()) as T & { error?: { message: string } };
  if (body && typeof body === "object" && "error" in body && body.error) {
    throw new Error(`${body.error.message} (${url})`);
  }
  return body;
}

/** Page through every matching row, mirroring arcgis.queryAll semantics. */
async function queryAll(
  layerId: number,
  params: Record<string, string>,
  maxRows = Infinity,
): Promise<Feature[]> {
  return queryAllFromLayer(
    `${SENSORCITY_FEATURE_SERVER_URL}/${layerId}`,
    params,
    maxRows,
  );
}

/** Page through a layer outside the main SensorCity FeatureServer. */
async function queryAllFromLayer(
  layerUrl: string,
  params: Record<string, string>,
  maxRows = Infinity,
): Promise<Feature[]> {
  const pageSize = Math.min(maxRows, ARCGIS_MAX_PAGE_SIZE);
  const out: Feature[] = [];
  let offset = 0;
  for (;;) {
    const url = new URL(`${layerUrl}/query`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("resultOffset", String(offset));
    url.searchParams.set("resultRecordCount", String(pageSize));
    url.searchParams.set("f", "json");
    const res = await getJson<{ features: Feature[] }>(url.toString());
    out.push(...res.features);
    offset += res.features.length;
    if (res.features.length < pageSize || out.length >= maxRows) break;
  }
  return out.slice(0, maxRows);
}

async function captureLiveFeatures(): Promise<Feature[]> {
  return queryAll(LIVE_LAYER_ID, {
    where: "1=1",
    outFields: "*",
    returnGeometry: "true",
    orderByFields: "objectid ASC",
  });
}

async function captureCount(layerId: number): Promise<number> {
  const res = await getJson<{ count: number }>(
    `${SENSORCITY_FEATURE_SERVER_URL}/${layerId}/query?where=1%3D1&returnCountOnly=true&f=json`,
  );
  return res.count;
}

async function captureFields(layerId: number): Promise<FieldInfo[]> {
  const meta = await getJson<{ fields?: FieldInfo[] }>(
    `${SENSORCITY_FEATURE_SERVER_URL}/${layerId}?f=json`,
  );
  return meta.fields ?? [];
}

function toFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

interface ArchiveCapture {
  /** Per-(device, field) series, keyed `${archiveLayerId}:${deviceId}:${field}`. */
  history: Record<string, TimeSeriesPoint[]>;
  /** Most-recent raw rows for the query explorer (capped at RAW_SAMPLE_ROWS). */
  sample: Feature[];
}

/**
 * Scan one archive layer once and derive everything from it: the complete
 * per-sensor history for each measurement, plus a recent raw-row sample. One
 * pass over the layer is far cheaper than a query per (device, field).
 */
async function captureArchiveLayer(
  archiveLayerId: number,
  fields: string[],
): Promise<ArchiveCapture> {
  // Order DESC so a capped scan keeps the most-recent rows; we restore
  // ascending order in the derived series below.
  const rows = await queryAll(
    archiveLayerId,
    {
      where: "1=1",
      outFields: ["objectid", "measured_at", "device_id", ...fields].join(","),
      orderByFields: "measured_at DESC",
    },
    HISTORY_MAX_ROWS,
  );

  const history: Record<string, TimeSeriesPoint[]> = {};
  for (const row of rows) {
    const deviceId = String(row.attributes.device_id ?? "");
    const timestamp = toFinite(row.attributes.measured_at);
    if (deviceId === "" || timestamp == null) continue;
    for (const field of fields) {
      const value = toFinite(row.attributes[field]);
      if (value == null) continue;
      const key = `${archiveLayerId}:${deviceId}:${field}`;
      (history[key] ??= []).push({ timestamp, value });
    }
  }
  for (const series of Object.values(history)) {
    series.sort((a, b) => a.timestamp - b.timestamp);
  }

  // rows are newest-first; take the head as the sample, oldest-first for display.
  const sample = rows.slice(0, RAW_SAMPLE_ROWS).reverse();
  return { history, sample };
}

async function captureHvzWaterLevels(): Promise<Record<string, TimeSeriesPoint[]>> {
  const stationIds = new Set<number>(
    FALLBACK_HISTORY_SOURCES.filter(
      (source) => source.provider === "hvz",
    ).map((source) => source.stationId),
  );
  const rows = await queryAllFromLayer(HVZ_WATER_LEVEL_LAYER_URL, {
    where: "1=1",
    outFields: "objectid,srid,datum,pegel",
    returnGeometry: "false",
    orderByFields: "datum ASC,objectid ASC",
  });
  const hvzWaterLevels: Record<string, TimeSeriesPoint[]> = {};
  for (const row of rows) {
    const stationId = toFinite(row.attributes.srid);
    const timestamp = toFinite(row.attributes.datum);
    const value = toFinite(row.attributes.pegel);
    if (
      stationId == null ||
      !stationIds.has(stationId) ||
      timestamp == null ||
      value == null
    ) {
      continue;
    }
    (hvzWaterLevels[String(stationId)] ??= []).push({ timestamp, value });
  }
  return hvzWaterLevels;
}

interface BrightskyPoint {
  timestamp: number;
  temperature: number;
  observed: boolean;
}

function isObserved(type: string | undefined): boolean {
  return type === "historical" || type === "current" || type === "synop";
}

function dateParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

async function captureBrightskyHourly(from: Date): Promise<BrightskyPoint[]> {
  const to = new Date();
  const url = new URL(`${BRIGHTSKY_BASE_URL}/weather`);
  url.searchParams.set("date", dateParam(from));
  url.searchParams.set("last_date", dateParam(to));
  url.searchParams.set("dwd_station_id", DWD_RHEINSTETTEN_STATION_ID);
  url.searchParams.set("tz", "Europe/Berlin");
  const body = await getJson<{
    weather?: Array<{ timestamp: string; temperature: number | null; source_id?: number }>;
    sources?: Array<{ id: number; observation_type: string }>;
  }>(url.toString());
  const typeBySource = new Map<number, string>();
  for (const s of body.sources ?? []) typeBySource.set(s.id, s.observation_type);
  const points: BrightskyPoint[] = [];
  for (const w of body.weather ?? []) {
    if (w.temperature == null) continue;
    points.push({
      timestamp: Date.parse(w.timestamp),
      temperature: w.temperature,
      observed: isObserved(w.source_id != null ? typeBySource.get(w.source_id) : undefined),
    });
  }
  return points.sort((a, b) => a.timestamp - b.timestamp);
}

async function captureBrightskyCurrent(): Promise<BrightskyPoint | null> {
  const url = new URL(`${BRIGHTSKY_BASE_URL}/current_weather`);
  url.searchParams.set("dwd_station_id", DWD_RHEINSTETTEN_STATION_ID);
  const body = await getJson<{
    weather?: { timestamp: string; temperature: number | null; source_id?: number };
    sources?: Array<{ id: number; observation_type: string }>;
  }>(url.toString());
  const w = body.weather;
  if (!w || w.temperature == null) return null;
  const source = body.sources?.find((s) => s.id === w.source_id);
  return {
    timestamp: Date.parse(w.timestamp),
    temperature: w.temperature,
    observed: isObserved(source?.observation_type),
  };
}

async function main(): Promise<void> {
  const historyLabel = Number.isFinite(HISTORY_MAX_ROWS)
    ? `≤${HISTORY_MAX_ROWS} rows/series`
    : "full archive";
  console.log(
    `Capturing SensorCity demo snapshot (${historyLabel}, ≥${WEATHER_MIN_DAYS}d weather)…`,
  );

  const liveFeatures = await captureLiveFeatures();
  console.log(`  live layer: ${liveFeatures.length} sensors`);

  const counts: Record<number, number> = {};
  const fields: Record<number, FieldInfo[]> = {};
  for (const layer of LAYERS) {
    counts[layer.id] = await captureCount(layer.id);
    fields[layer.id] = await captureFields(layer.id);
  }

  // Scan each archive layer once: every category maps to one archive layer, so
  // a single pass yields the full per-sensor history plus a recent raw sample.
  const archiveCategories = CATEGORIES.filter((c) => c.archiveLayerId != null);
  const captures = await mapWithConcurrency(
    archiveCategories,
    CONCURRENCY,
    (category) =>
      captureArchiveLayer(
        category.archiveLayerId as number,
        category.measurements.map((m) => m.field),
      ),
  );
  const history: Record<string, TimeSeriesPoint[]> = {};
  const rawArchiveFeatures: Record<number, Feature[]> = {};
  archiveCategories.forEach((category, i) => {
    Object.assign(history, captures[i].history);
    rawArchiveFeatures[category.archiveLayerId as number] = captures[i].sample;
  });
  console.log(
    `  history: ${Object.keys(history).length} series; ` +
      `raw sample: ${Object.values(rawArchiveFeatures).reduce((n, r) => n + r.length, 0)} rows`,
  );

  const hvzWaterLevels = await captureHvzWaterLevels();
  console.log(
    `  HVZ water levels: ${Object.values(hvzWaterLevels).reduce((n, rows) => n + rows.length, 0)} points`,
  );

  // Extend the weather window back to the oldest captured reading so the
  // historical temperature replay has a baseline for every frame.
  const now = Date.now();
  let oldest = now - WEATHER_MIN_DAYS * 24 * 60 * 60 * 1000;
  for (const series of Object.values(history)) {
    if (series.length > 0) oldest = Math.min(oldest, series[0].timestamp);
  }
  const brightskyHourly = await captureBrightskyHourly(new Date(oldest));
  const brightskyCurrent = await captureBrightskyCurrent();
  console.log(`  brightsky: ${brightskyHourly.length} hourly points`);

  const snapshot: DemoSnapshot = {
    capturedAt: new Date().toISOString(),
    historyMaxRows: Number.isFinite(HISTORY_MAX_ROWS) ? HISTORY_MAX_ROWS : null,
    liveFeatures,
    counts,
    fields,
    history,
    rawArchiveFeatures,
    hvzWaterLevels,
    brightskyHourly,
    brightskyCurrent,
  };

  // Store gzipped: the full archive is >100 MB raw (over GitHub's per-file
  // limit), but ~19 MB gzipped. The browser inflates it via DecompressionStream.
  const json = JSON.stringify(snapshot);
  const gz = gzipSync(json, { level: 9 });
  const outPath = fileURLToPath(new URL("../public/demo-snapshot.json.gz", import.meta.url));
  await writeFile(outPath, gz);
  console.log(
    `Wrote ${outPath} (${(gz.length / 1024 / 1024).toFixed(2)} MB gzipped, ` +
      `${(Buffer.byteLength(json) / 1024 / 1024).toFixed(2)} MB raw)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
