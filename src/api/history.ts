// Resolves where one sensor's measurement history comes from.
//
// Not every category has an archive layer in the main SensorCity service (water
// gauges, for example, use a separate FeatureServer), so callers ask here rather
// than calling `fetchHistory` directly: this picks the main archive when the
// category has one and falls back to a matching configured provider otherwise.

import {
  getFallbackHistorySource,
  type FallbackHistoryProvider,
  type FallbackHistorySource,
} from "../config/historySources";
import type { Category, Sensor } from "../types";
import { fetchHvzWaterLevelHistory } from "./hvz";
import { fetchHistory, type TimeSeriesPoint } from "./sensorcity";

/** Which upstream provider a history series is read from. */
export type HistoryProvider = "sensorcity" | FallbackHistoryProvider;

export interface HistorySourceMetadata {
  provider: HistoryProvider;
  label: string;
  /** Public URL for the upstream series; absent for the SensorCity archive. */
  url?: string;
}

export type HistoryFetcher = (signal?: AbortSignal) => Promise<TimeSeriesPoint[]>;

export interface ResolvedHistorySource {
  metadata: HistorySourceMetadata;
  fetchHistory: HistoryFetcher;
}

type FallbackFetcherFactoryRegistry = {
  [Provider in FallbackHistoryProvider]: (
    source: Extract<FallbackHistorySource, { provider: Provider }>,
  ) => HistoryFetcher;
};

/** Keep provider-specific reads exhaustive and correctly typed as the union grows. */
const FALLBACK_FETCHER_FACTORIES: FallbackFetcherFactoryRegistry = {
  hvz: (source) => (signal) =>
    fetchHvzWaterLevelHistory(source.stationId, signal),
};

function createFallbackHistoryFetcher(
  source: FallbackHistorySource,
): HistoryFetcher {
  // TypeScript cannot preserve the correlation between a union's discriminator
  // and an indexed mapped type. The registry definition enforces it at creation.
  const createFetcher = FALLBACK_FETCHER_FACTORIES[source.provider] as (
    source: FallbackHistorySource,
  ) => HistoryFetcher;
  return createFetcher(source);
}

export function resolveHistorySource(
  sensor: Sensor,
  category: Category | undefined,
  field: string,
): ResolvedHistorySource | null {
  const archiveLayerId = category?.archiveLayerId;
  if (archiveLayerId != null) {
    return {
      metadata: { provider: "sensorcity", label: "SensorCity" },
      fetchHistory: (signal) =>
        fetchHistory(archiveLayerId, sensor.deviceId, field, {}, signal),
    };
  }

  const fallback = getFallbackHistorySource(sensor, field);
  if (!fallback) return null;

  return {
    metadata: {
      provider: fallback.provider,
      label: fallback.label,
      url: fallback.url,
    },
    fetchHistory: createFallbackHistoryFetcher(fallback),
  };
}
