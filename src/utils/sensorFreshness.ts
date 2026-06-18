import type { Sensor } from "../types";

export const RECENT_SENSOR_WINDOW_MS = 60 * 60 * 1000;

/** True when the sensor has a live-layer measurement from the last hour. */
export function isRecentlyMeasured(
  sensor: Pick<Sensor, "measuredAt">,
  now = Date.now(),
): boolean {
  return (
    sensor.measuredAt != null &&
    now - sensor.measuredAt >= 0 &&
    now - sensor.measuredAt <= RECENT_SENSOR_WINDOW_MS
  );
}
