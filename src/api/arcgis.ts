// Thin, typed client for an ArcGIS REST FeatureServer `/query` endpoint.
//
// Kept deliberately small and generic: it knows nothing about SensorCity
// semantics (that lives in `config/layers.ts` and `api/sensorcity.ts`). This
// makes it reusable for any layer and easy to test or swap.

import { ARCGIS_BASE_URL as BASE_URL, MAX_RECORD_COUNT } from "../config/endpoints";
import { isDemoMode, loadDemoApi } from "../demo/mode";
import type { Feature, FieldInfo, QueryResponse } from "../types";

// Re-exported so callers that surface the service contract (e.g. QueryView's
// page-size cap) keep importing it from the client they talk to.
export { MAX_RECORD_COUNT };

export interface QueryParams {
  /** SQL filter. Defaults to `1=1` (match all). */
  where?: string;
  /** Field list or `*`. */
  outFields?: string;
  orderByFields?: string;
  resultOffset?: number;
  resultRecordCount?: number;
  returnGeometry?: boolean;
  returnCountOnly?: boolean;
  groupByFieldsForStatistics?: string;
  outStatistics?: OutStatistic[];
  f?: "json" | "geojson";
}

export interface OutStatistic {
  statisticType: "count" | "sum" | "min" | "max" | "avg" | "stddev" | "var";
  onStatisticField: string;
  outStatisticFieldName: string;
}

/**
 * Build the `/query` GET URL for a layer. Exported so UI that surfaces the
 * resolved request (e.g. the query explorer) shows exactly what `query` hits,
 * rather than re-serializing the params and risking drift.
 */
export function queryUrl(layerId: number, params: QueryParams): string {
  const url = new URL(`${BASE_URL}/${layerId}/query`);
  const p = url.searchParams;
  p.set("where", params.where ?? "1=1");
  if (params.outFields) p.set("outFields", params.outFields);
  if (params.orderByFields) p.set("orderByFields", params.orderByFields);
  if (params.resultOffset != null)
    p.set("resultOffset", String(params.resultOffset));
  if (params.resultRecordCount != null)
    p.set("resultRecordCount", String(params.resultRecordCount));
  if (params.returnGeometry != null)
    p.set("returnGeometry", String(params.returnGeometry));
  if (params.returnCountOnly) p.set("returnCountOnly", "true");
  if (params.groupByFieldsForStatistics)
    p.set("groupByFieldsForStatistics", params.groupByFieldsForStatistics);
  if (params.outStatistics)
    p.set("outStatistics", JSON.stringify(params.outStatistics));
  p.set("f", params.f ?? "json");
  return url.toString();
}

class ArcGisError extends Error {}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new ArcGisError(`Request failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as T & { error?: { message: string } };
  // ArcGIS reports query errors with HTTP 200 and an `error` envelope.
  if (body && typeof body === "object" && "error" in body && body.error) {
    throw new ArcGisError(body.error.message);
  }
  return body;
}

/** Run a single `/query` request (returns geometry off by default). */
export async function query(
  layerId: number,
  params: QueryParams,
  signal?: AbortSignal,
): Promise<QueryResponse> {
  if (isDemoMode()) return (await loadDemoApi()).query(layerId, params);
  const url = queryUrl(layerId, { returnGeometry: false, ...params });
  return fetchJson<QueryResponse>(url, signal);
}

/** Return only the count of matching rows. */
export async function queryCount(
  layerId: number,
  where = "1=1",
  signal?: AbortSignal,
): Promise<number> {
  if (isDemoMode()) return (await loadDemoApi()).count(layerId, where);
  const res = await fetchJson<{ count: number }>(
    queryUrl(layerId, { where, returnCountOnly: true }),
    signal,
  );
  return res.count;
}

/** Run an `outStatistics` aggregation and return the raw feature rows. */
export async function queryStatistics(
  layerId: number,
  outStatistics: OutStatistic[],
  options: { where?: string; groupByFieldsForStatistics?: string } = {},
  signal?: AbortSignal,
): Promise<Feature[]> {
  const res = await query(
    layerId,
    { ...options, outStatistics, returnGeometry: false },
    signal,
  );
  return res.features;
}

/**
 * Page through every matching row. A stable `orderByFields` is required for
 * correct pagination, so we default to the object id. `maxRows` caps the pull
 * to keep the UI responsive on large layers.
 */
export async function queryAll(
  layerId: number,
  params: QueryParams = {},
  options: { maxRows?: number } = {},
  signal?: AbortSignal,
): Promise<Feature[]> {
  const maxRows = options.maxRows ?? Infinity;
  const pageSize = Math.min(params.resultRecordCount ?? MAX_RECORD_COUNT, MAX_RECORD_COUNT);
  const orderByFields = params.orderByFields ?? "objectid ASC";
  const out: Feature[] = [];
  let offset = 0;

  for (;;) {
    const res = await query(
      layerId,
      { ...params, orderByFields, resultOffset: offset, resultRecordCount: pageSize },
      signal,
    );
    out.push(...res.features);
    offset += res.features.length;
    const done = res.features.length < pageSize || out.length >= maxRows;
    if (done) break;
  }
  return out.slice(0, maxRows);
}

/** Fetch a layer's field metadata. */
export async function getLayerFields(
  layerId: number,
  signal?: AbortSignal,
): Promise<FieldInfo[]> {
  if (isDemoMode()) return (await loadDemoApi()).layerFields(layerId);
  const url = `${BASE_URL}/${layerId}?f=json`;
  const meta = await fetchJson<{ fields?: FieldInfo[] }>(url, signal);
  return meta.fields ?? [];
}
