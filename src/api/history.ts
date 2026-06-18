import { externalHistorySourceFor } from "../config/historySources";
import type { Category, Sensor } from "../types";
import { fetchPegelOnlineHistory } from "./pegelonline";
import { fetchHistory, type TimeSeriesPoint } from "./sensorcity";

export type HistorySourceKind = "sensorcity" | "external";

export interface HistorySourceInfo {
  kind: HistorySourceKind;
  label: string;
  url?: string;
}

export interface ResolvedHistorySource {
  info: HistorySourceInfo;
  fetch(signal?: AbortSignal): Promise<TimeSeriesPoint[]>;
}

export function resolveHistorySource(
  sensor: Sensor,
  category: Category | undefined,
  field: string,
): ResolvedHistorySource | null {
  const archiveLayerId = category?.archiveLayerId;
  if (archiveLayerId != null) {
    return {
      info: { kind: "sensorcity", label: "SensorCity" },
      fetch: (signal) =>
        fetchHistory(archiveLayerId, sensor.deviceId, field, {}, signal),
    };
  }

  const external = externalHistorySourceFor(sensor, field);
  if (external?.provider === "pegelonline") {
    return {
      info: { kind: "external", label: external.label, url: external.sourceUrl },
      fetch: (signal) =>
        fetchPegelOnlineHistory(
          external.stationUuid,
          external.parameter,
          undefined,
          signal,
        ),
    };
  }

  return null;
}
