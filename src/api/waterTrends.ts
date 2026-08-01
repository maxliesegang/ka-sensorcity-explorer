// Each water gauge's recent direction, for the overview's conditions card.
//
// Gauges have no SensorCity archive of their own, so the history comes through
// `resolveHistorySource` like the detail view's — one request per gauge, and
// there are three.

import { getCategory, WATER_LEVEL_FIELD_KEY } from "../config/layers";
import type { Sensor } from "../types";
import { getWaterTrend, type WaterTrend } from "../utils/waterTrend";
import { resolveHistorySource } from "./history";

/** Trends by sensor `objectId`; gauges without enough history are absent. */
export type WaterTrends = ReadonlyMap<number, WaterTrend>;

/**
 * Read every given gauge's level history and reduce each to its trend.
 *
 * A gauge whose upstream is unreachable or too short is simply left out — the
 * card still shows its level, and one silent gauge must not cost the others
 * their trend, nor the overview its rain and temperature answers.
 */
export async function fetchWaterTrends(
  gauges: readonly Sensor[],
  signal?: AbortSignal,
): Promise<WaterTrends> {
  const results = await Promise.all(
    gauges.map(async (gauge) => {
      const source = resolveHistorySource(
        gauge,
        getCategory(gauge.category),
        WATER_LEVEL_FIELD_KEY,
      );
      if (!source) return null;
      try {
        const trend = getWaterTrend(await source.fetchHistory(signal));
        return trend ? ([gauge.objectId, trend] as const) : null;
      } catch {
        return null;
      }
    }),
  );

  return new Map(results.filter((entry) => entry !== null));
}
