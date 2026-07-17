// Declarative map of (category, field, device) → the fallback source holding
// that sensor's history when the main SensorCity service has no archive layer.

import type { Sensor } from "../types";
// This config is also imported directly by the Node-run snapshot capture;
// retain the extension so Node's native TypeScript loader can resolve it.
import { HVZ_WATER_LEVEL_LAYER_URL } from "./endpoints.ts";

interface FallbackHistorySourceBase {
  /** Live-layer category key, e.g. `Wasserpegel-Sensor`. */
  categoryKey: string;
  /** Measurement field on the SensorCity live layer, e.g. `pegel`. */
  field: string;
  /** SensorCity `device_id` used to match the live sensor to this source. */
  deviceId: string;
  label: string;
  url: string;
}

export interface HvzHistorySource extends FallbackHistorySourceBase {
  provider: "hvz";
  /** Numeric station id in the HVZ archive (`srid` upstream). */
  stationId: number;
}

/** Provider-specific source config, discriminated by `provider`. */
export type FallbackHistorySource = HvzHistorySource;
export type FallbackHistoryProvider = FallbackHistorySource["provider"];

export const FALLBACK_HISTORY_SOURCES = [
  {
    provider: "hvz",
    categoryKey: "Wasserpegel-Sensor",
    field: "pegel",
    deviceId: "109",
    label: "LUBW/HVZ",
    url: HVZ_WATER_LEVEL_LAYER_URL,
    stationId: 109,
  },
  {
    provider: "hvz",
    categoryKey: "Wasserpegel-Sensor",
    field: "pegel",
    deviceId: "110",
    label: "LUBW/HVZ",
    url: HVZ_WATER_LEVEL_LAYER_URL,
    stationId: 110,
  },
  {
    provider: "hvz",
    categoryKey: "Wasserpegel-Sensor",
    field: "pegel",
    deviceId: "9016",
    label: "LUBW/HVZ",
    url: HVZ_WATER_LEVEL_LAYER_URL,
    stationId: 9016,
  },
] as const satisfies readonly FallbackHistorySource[];

export function getFallbackHistorySource(
  sensor: Sensor,
  field: string,
): FallbackHistorySource | undefined {
  return FALLBACK_HISTORY_SOURCES.find(
    (source) =>
      source.categoryKey === sensor.category &&
      source.deviceId === sensor.deviceId &&
      source.field === field,
  );
}
