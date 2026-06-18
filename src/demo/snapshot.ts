// The frozen demo dataset and its lazy loader.
//
// The snapshot is a plain JSON file in `public/` (produced by
// `scripts/capture-demo.ts`) rather than a bundled import, so it stays out of
// the main JS bundle and is only fetched when demo mode is actually used.

import type { DwdHourlyPoint } from "../api/brightsky";
import type { TimeSeriesPoint } from "../api/sensorcity";
import type { Feature, FieldInfo } from "../types";

export interface DemoSnapshot {
  capturedAt: string;
  /** Per-series row cap used at capture time, or null for the full archive. */
  historyMaxRows: number | null;
  /** Raw live-layer features (layer 1), including geometry. */
  liveFeatures: Feature[];
  /** Total row count per layer id. */
  counts: Record<number, number>;
  /** Field metadata per layer id. */
  fields: Record<number, FieldInfo[]>;
  /** Per-sensor history keyed by `${archiveLayerId}:${deviceId}:${field}`. */
  history: Record<string, TimeSeriesPoint[]>;
  /**
   * Most-recent raw archive rows per archive layer id, so the query explorer
   * returns real data for layers 2-5. A bounded sample, not the full archive.
   */
  rawArchiveFeatures: Record<number, Feature[]>;
  /** PEGELONLINE history keyed by `${stationUuid}:${parameter}`. */
  pegel: Record<string, TimeSeriesPoint[]>;
  /** DWD Rheinstetten hourly temperatures over the captured window. */
  brightskyHourly: DwdHourlyPoint[];
  /** Latest captured DWD Rheinstetten observation. */
  brightskyCurrent: DwdHourlyPoint | null;
}

// Stored gzipped (the full archive is >100 MB raw) and inflated in the browser.
const SNAPSHOT_URL = `${import.meta.env.BASE_URL}demo-snapshot.json.gz`;

let cached: Promise<DemoSnapshot> | null = null;

async function fetchSnapshot(): Promise<DemoSnapshot> {
  const res = await fetch(SNAPSHOT_URL);
  if (!res.ok || res.body == null) {
    throw new Error(`Demo snapshot unavailable: HTTP ${res.status}`);
  }
  // Whether we need to inflate the body ourselves is host-dependent: GitHub
  // Pages serves the `.gz` as opaque bytes (raw gzip arrives here), but the
  // Vite dev server sends it with `Content-Encoding: gzip`, so the browser has
  // already transparently inflated it to plain JSON. Decompressing twice throws,
  // so peek the gzip magic bytes (0x1f 0x8b) and only inflate when present.
  const [head, body] = res.body.tee();
  const reader = head.getReader();
  const { value } = await reader.read();
  void reader.cancel();
  const isGzip = value != null && value[0] === 0x1f && value[1] === 0x8b;
  const stream = isGzip
    ? body.pipeThrough(new DecompressionStream("gzip"))
    : body;
  return new Response(stream).json() as Promise<DemoSnapshot>;
}

/** Fetch and memoize the snapshot. Subsequent callers share one request. */
export function loadSnapshot(): Promise<DemoSnapshot> {
  if (cached == null) cached = fetchSnapshot();
  return cached;
}
