import { describe, expect, it } from "vitest";

import { TEMPERATURE_CATEGORY_KEY } from "../config/layers";
import type { Sensor } from "../types";
import { distanceMeters, formatDistance, getNearestSensors } from "./geo";

const KARLSRUHE_PALACE = { lat: 49.0134, lon: 8.4044 };

function sensor(objectId: number, lat: number | null, lon: number | null): Sensor {
  return {
    objectId,
    deviceId: `device-${objectId}`,
    name: `00${objectId} - Street`,
    category: TEMPERATURE_CATEGORY_KEY,
    lat,
    lon,
    measuredAt: 1_700_000_000_000,
    attributes: {},
  };
}

describe("distanceMeters", () => {
  it("is zero for the same point", () => {
    expect(distanceMeters(KARLSRUHE_PALACE, KARLSRUHE_PALACE)).toBe(0);
  });

  it("matches a known separation within a percent", () => {
    // One degree of latitude is ~111.2 km anywhere on the sphere.
    const km = distanceMeters({ lat: 49, lon: 8.4 }, { lat: 50, lon: 8.4 }) / 1000;
    expect(km).toBeGreaterThan(111);
    expect(km).toBeLessThan(112);
  });

  it("is symmetric", () => {
    const a = { lat: 49.0, lon: 8.4 };
    const b = { lat: 49.01, lon: 8.42 };
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });
});

describe("getNearestSensors", () => {
  it("returns the closest sensors, nearest first", () => {
    const nearest = getNearestSensors(
      [
        sensor(1, 49.05, 8.4),
        sensor(2, 49.0135, 8.4045),
        sensor(3, 49.02, 8.41),
      ],
      KARLSRUHE_PALACE,
      2,
    );

    expect(nearest.map((entry) => entry.sensor.objectId)).toEqual([2, 3]);
    expect(nearest[0].distanceMeters).toBeLessThan(nearest[1].distanceMeters);
  });

  it("skips sensors without coordinates", () => {
    const nearest = getNearestSensors(
      [sensor(1, null, null), sensor(2, 49.02, 8.41)],
      KARLSRUHE_PALACE,
    );

    expect(nearest.map((entry) => entry.sensor.objectId)).toEqual([2]);
  });

  it("returns nothing for a non-positive limit", () => {
    expect(getNearestSensors([sensor(1, 49.02, 8.41)], KARLSRUHE_PALACE, 0)).toEqual([]);
  });
});

describe("formatDistance", () => {
  it("rounds metres to the nearest ten below a kilometre", () => {
    expect(formatDistance(484)).toBe("480 m");
    expect(formatDistance(0)).toBe("0 m");
  });

  it("switches to kilometres with one decimal", () => {
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(1449)).toBe("1.4 km");
  });
});
