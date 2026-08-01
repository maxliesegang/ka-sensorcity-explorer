// Loads one whole depth profile per probe and reduces it immediately to small,
// presentation-independent reference statistics. Requests are bounded because
// the archive exposes history per device rather than as a joined live view.

import type { DepthProfile } from "../types";
import { mapWithConcurrency, type BatchProgress } from "../utils/concurrency";
import {
  buildSoilHistoryStats,
  type SoilHistoryStats,
} from "../utils/soilHistoryReference";
import {
  isUsableSoilValue,
  type SoilProbeReading,
} from "../utils/soilFieldReadings";
import { fetchHistoryRows } from "./sensorcity";

const HISTORY_REQUEST_CONCURRENCY = 4;
export const SOIL_HISTORY_WINDOW_DAYS = 30;
const SOIL_HISTORY_WINDOW_MS = SOIL_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export interface SoilHistoryReferences {
  /** Per object id, then per depth-band index. */
  byObjectId: Readonly<Record<string, readonly (SoilHistoryStats | null)[]>>;
  failedProbeCount: number;
}

export async function fetchSoilHistoryReferences(
  archiveLayerId: number,
  probes: readonly SoilProbeReading[],
  profile: DepthProfile,
  signal?: AbortSignal,
  onBatchProgress?: (batchProgress: BatchProgress) => void,
): Promise<SoilHistoryReferences> {
  let failedProbeCount = 0;
  let firstFailure: unknown;
  const entries = await mapWithConcurrency(
    [...probes],
    HISTORY_REQUEST_CONCURRENCY,
    async (probe) => {
      try {
        // Anchor the rolling window to the probe's live reading. This is almost
        // Date.now() in production and remains correct for a frozen demo snapshot.
        const referenceTime = probe.sensor.measuredAt ?? Date.now();
        const rows = await fetchHistoryRows(
          archiveLayerId,
          probe.sensor.deviceId,
          profile.bands.map((band) => band.field),
          { since: new Date(referenceTime - SOIL_HISTORY_WINDOW_MS) },
          signal,
        );
        const valuesByBand = profile.bands.map(() => [] as number[]);
        for (const row of rows) {
          row.values.forEach((value, bandIndex) => {
            if (isUsableSoilValue(profile.ramp, value)) {
              valuesByBand[bandIndex].push(value);
            }
          });
        }
        const bands = valuesByBand.map(buildSoilHistoryStats);
        return [String(probe.sensor.objectId), bands] as const;
      } catch (error) {
        if (signal?.aborted) throw error;
        firstFailure ??= error;
        failedProbeCount += 1;
        return null;
      }
    },
    onBatchProgress,
  );

  // Partial coverage is still useful; a total upstream failure is not. Let the
  // async boundary distinguish that case and keep showing current values.
  if (probes.length > 0 && failedProbeCount === probes.length) {
    throw firstFailure instanceof Error
      ? firstFailure
      : new Error("Soil history could not be loaded");
  }

  return {
    byObjectId: Object.fromEntries(entries.filter((entry) => entry != null)),
    failedProbeCount,
  };
}
