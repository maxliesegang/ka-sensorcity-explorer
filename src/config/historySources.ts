// Declarative map of (category, field, device) → the external network holding
// that sensor's history. Adding an external history source is an entry here.

import type { HistoryProvider } from "../api/history";
import type { Sensor } from "../types";

/** The external providers; `sensorcity` is the built-in archive, not an entry here. */
export type ExternalHistoryProvider = Exclude<HistoryProvider, "sensorcity">;

export interface ExternalHistorySource {
  provider: ExternalHistoryProvider;
  /** Live-layer category key, e.g. `Wasserpegel-Sensor`. */
  categoryKey: string;
  /** Measurement field on the SensorCity live layer, e.g. `pegel`. */
  field: string;
  /** SensorCity `device_id` used to match the live sensor to this source. */
  deviceId: string;
  label: string;
  sourceUrl: string;
  stationUuid: string;
  parameter: string;
}

export const EXTERNAL_HISTORY_SOURCES: ExternalHistorySource[] = [
  {
    provider: "pegelonline",
    categoryKey: "Wasserpegel-Sensor",
    field: "pegel",
    deviceId: "9016",
    label: "PEGELONLINE",
    sourceUrl:
      "https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/b6c6d5c8-e2d5-4469-8dd8-fa972ef7eaea/W/measurements.json?start=P30D",
    stationUuid: "b6c6d5c8-e2d5-4469-8dd8-fa972ef7eaea",
    parameter: "W",
  },
];

export function externalHistorySourceFor(
  sensor: Sensor,
  field: string,
): ExternalHistorySource | undefined {
  return EXTERNAL_HISTORY_SOURCES.find(
    (source) =>
      source.categoryKey === sensor.category &&
      source.deviceId === sensor.deviceId &&
      source.field === field,
  );
}
