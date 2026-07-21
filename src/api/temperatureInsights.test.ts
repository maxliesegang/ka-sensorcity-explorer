import { describe, expect, it } from "vitest";

import type { Sensor } from "../types";
import { buildHistoricalTemperatureFieldFrames } from "./temperatureInsights";

const MINUTE = 60_000;

function sensor(objectId: number, lat: number | null = 49): Sensor {
  return {
    objectId,
    deviceId: `device-${objectId}`,
    name: `Sensor ${objectId}`,
    category: "Temperatur-Sensor",
    lat,
    lon: lat == null ? null : 8.4,
    measuredAt: null,
    attributes: {},
  };
}

describe("buildHistoricalTemperatureFieldFrames", () => {
  it("uses the latest reading at or before each frame without using future data", () => {
    const frames = buildHistoricalTemperatureFieldFrames(
      [sensor(1), sensor(2)],
      [
        [{ timestamp: 2 * MINUTE, value: 10 }, { timestamp: 17 * MINUTE, value: 20 }],
        [{ timestamp: 4 * MINUTE, value: 30 }],
      ],
      5 * MINUTE,
      60 * MINUTE,
    );

    expect(frames.map((frame) => frame.timestamp / MINUTE)).toEqual([0, 5, 10, 15, 20]);
    expect(frames[0].points).toEqual([]);
    expect(frames[1].points.map((point) => point.observedAt / MINUTE)).toEqual([2, 4]);
    expect(frames[3].points[0].temperature).toBe(10);
    expect(frames[4].points[0]).toMatchObject({ temperature: 20, observedAt: 17 * MINUTE });
  });

  it("excludes readings beyond the maximum age and sensors without coordinates", () => {
    const frames = buildHistoricalTemperatureFieldFrames(
      [sensor(1), sensor(2, null)],
      [
        [{ timestamp: 0, value: 10 }, { timestamp: 15 * MINUTE, value: 11 }],
        [{ timestamp: 30 * MINUTE, value: 20 }],
      ],
      5 * MINUTE,
      10 * MINUTE,
    );

    expect(frames[3].points).toHaveLength(1);
    expect(frames[3].points[0].objectId).toBe(1);
    expect(frames[frames.length - 1].points).toEqual([]);
  });

  it("rejects invalid frame and freshness intervals", () => {
    expect(() => buildHistoricalTemperatureFieldFrames([], [], 0, MINUTE)).toThrow(RangeError);
    expect(() => buildHistoricalTemperatureFieldFrames([], [], MINUTE, -1)).toThrow(RangeError);
  });
});
