import type { Sensor } from "../types";

export const RECENT_SENSOR_WINDOW_MS = 60 * 60 * 1000;

/**
 * True when an epoch-ms reading timestamp falls within the recent window —
 * i.e. it's finite, not in the future, and no older than RECENT_SENSOR_WINDOW_MS.
 * Shared by the SensorCity and external community clients so every source treats
 * "recently measured" identically.
 */
export function isRecentReading(
  measuredAt: number | null | undefined,
  now = Date.now(),
): boolean {
  return (
    measuredAt != null &&
    Number.isFinite(measuredAt) &&
    now - measuredAt >= 0 &&
    now - measuredAt <= RECENT_SENSOR_WINDOW_MS
  );
}

/** True when the sensor has a live-layer measurement from the last hour. */
export function isRecentlyMeasured(
  sensor: Pick<Sensor, "measuredAt">,
  now = Date.now(),
): boolean {
  return isRecentReading(sensor.measuredAt, now);
}
