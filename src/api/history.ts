// Resolves where one sensor's measurement history comes from.
//
// Not every category has a SensorCity archive layer (water gauges, for example,
// are published only on the live layer), so callers ask here rather than calling
// `fetchHistory` directly: this picks the SensorCity archive when the category
// has one and falls back to a matching external provider otherwise.

import {
  externalHistorySourceFor,
  type ExternalHistoryProvider,
  type ExternalHistorySource,
} from "../config/historySources";
import type { Category, Sensor } from "../types";
import { fetchPegelOnlineHistory } from "./pegelonline";
import { fetchHistory, type TimeSeriesPoint } from "./sensorcity";

/** Which upstream network a history series is read from. */
export type HistoryProvider = "sensorcity" | "pegelonline";

export interface HistorySourceInfo {
  provider: HistoryProvider;
  label: string;
  /** Public page for the upstream series; absent for the SensorCity archive. */
  url?: string;
}

export type HistoryFetcher = (signal?: AbortSignal) => Promise<TimeSeriesPoint[]>;

export interface ResolvedHistorySource {
  info: HistorySourceInfo;
  fetch: HistoryFetcher;
}

/**
 * How to read a series from each external provider. Keyed by provider so adding
 * one is an entry here plus its `EXTERNAL_HISTORY_SOURCES` config —
 * `resolveHistorySource` itself stays provider-agnostic. `Record` over the
 * union makes a missing provider a compile error, not a runtime `null`.
 */
const EXTERNAL_FETCHERS: Record<
  ExternalHistoryProvider,
  (source: ExternalHistorySource) => HistoryFetcher
> = {
  pegelonline: (source) => (signal) =>
    fetchPegelOnlineHistory(source.stationUuid, source.parameter, undefined, signal),
};

export function resolveHistorySource(
  sensor: Sensor,
  category: Category | undefined,
  field: string,
): ResolvedHistorySource | null {
  const archiveLayerId = category?.archiveLayerId;
  if (archiveLayerId != null) {
    return {
      info: { provider: "sensorcity", label: "SensorCity" },
      fetch: (signal) =>
        fetchHistory(archiveLayerId, sensor.deviceId, field, {}, signal),
    };
  }

  const external = externalHistorySourceFor(sensor, field);
  if (!external) return null;

  return {
    info: {
      provider: external.provider,
      label: external.label,
      url: external.sourceUrl,
    },
    fetch: EXTERNAL_FETCHERS[external.provider](external),
  };
}
