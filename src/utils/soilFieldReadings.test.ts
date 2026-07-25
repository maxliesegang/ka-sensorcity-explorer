import { describe, expect, it } from "vitest";

import { SOIL_CATEGORY_KEY, TEMPERATURE_CATEGORY_KEY } from "../config/layers";
import type { Attributes, DepthProfile, Sensor } from "../types";
import {
  getSoilBandStats,
  getSoilFieldPoints,
  getSoilFieldValues,
  getSoilProfile,
  getSoilProfiles,
  getSoilProbeReadings,
  isUsableSoilValue,
} from "./soilFieldReadings";

const NOW = 1_700_000_000_000;

const profile: DepthProfile = {
  key: "soil_temperature",
  unit: "°C",
  ramp: "temperature",
  bands: [
    { field: "b0", band: 0 },
    { field: "b1", band: 1 },
    { field: "b2", band: 2 },
  ],
};

function sensor(overrides: Partial<Sensor> & { attributes?: Attributes } = {}): Sensor {
  return {
    objectId: 1,
    deviceId: "device-1",
    name: "001 - Somewhere",
    category: SOIL_CATEGORY_KEY,
    lat: 49,
    lon: 8.4,
    measuredAt: NOW - 60_000,
    attributes: { b0: 20, b1: 21, b2: 22 },
    ...overrides,
  };
}

describe("isUsableSoilValue", () => {
  it("rejects the probes' not-connected sentinels per quantity", () => {
    expect(isUsableSoilValue("temperature", -328)).toBe(false);
    expect(isUsableSoilValue("moisture", -5)).toBe(false);
    expect(isUsableSoilValue("temperature", null)).toBe(false);
  });

  it("keeps real readings, including slightly negative moisture", () => {
    expect(isUsableSoilValue("temperature", -3)).toBe(true);
    expect(isUsableSoilValue("moisture", -0.4)).toBe(true);
    expect(isUsableSoilValue("moisture", 0)).toBe(true);
  });
});

describe("getSoilProfiles", () => {
  it("reads the soil category's declared quantities", () => {
    const keys = getSoilProfiles().map((p) => p.key);
    expect(keys).toContain("soil_temperature");
    expect(keys).toContain("soil_moisture");
    expect(getSoilProfile("soil_moisture")?.ramp).toBe("moisture");
    expect(getSoilProfile("nope")).toBeUndefined();
  });
});

describe("getSoilProbeReadings", () => {
  it("keeps fresh, geolocated soil probes and drops everything else", () => {
    const probes = getSoilProbeReadings(
      [
        sensor(),
        sensor({ objectId: 2, category: TEMPERATURE_CATEGORY_KEY }),
        sensor({ objectId: 3, measuredAt: NOW - 5 * 60 * 60 * 1000 }),
        sensor({ objectId: 4, lat: null }),
      ],
      profile,
      NOW,
    );
    expect(probes.map((probe) => probe.sensor.objectId)).toEqual([1]);
    expect(probes[0].bandValues).toEqual([20, 21, 22]);
  });

  it("nulls sentinel bands but keeps the probe for its usable ones", () => {
    const probes = getSoilProbeReadings(
      [sensor({ attributes: { b0: 20, b1: -328, b2: 22 } })],
      profile,
      NOW,
    );
    expect(probes[0].bandValues).toEqual([20, null, 22]);
  });

  it("drops a probe whose every band is unusable", () => {
    const probes = getSoilProbeReadings(
      [sensor({ attributes: { b0: -328, b1: null, b2: "n/a" } })],
      profile,
      NOW,
    );
    expect(probes).toEqual([]);
  });
});

describe("getSoilFieldPoints", () => {
  it("maps only the probes reporting the selected band", () => {
    const probes = getSoilProbeReadings(
      [
        sensor(),
        sensor({ objectId: 2, attributes: { b0: 18, b1: -328, b2: 19 } }),
      ],
      profile,
      NOW,
    );

    expect(getSoilFieldPoints(probes, 1).map((point) => point.value)).toEqual([21]);
    expect(getSoilFieldPoints(probes, 0).map((point) => point.value)).toEqual([20, 18]);
  });
});

describe("getSoilFieldValues", () => {
  it("collects every band's usable value, which is the scale's domain", () => {
    const probes = getSoilProbeReadings(
      [sensor(), sensor({ objectId: 2, attributes: { b0: 30, b1: -328, b2: 31 } })],
      profile,
      NOW,
    );
    expect(getSoilFieldValues(probes).sort((a, b) => a - b)).toEqual([
      20, 21, 22, 30, 31,
    ]);
  });
});

describe("getSoilBandStats", () => {
  it("summarizes each band shallow→deep over the probes reporting it", () => {
    const probes = getSoilProbeReadings(
      [
        sensor({ attributes: { b0: 20, b1: 24, b2: 26 } }),
        sensor({ objectId: 2, attributes: { b0: 22, b1: 26, b2: -328 } }),
        sensor({ objectId: 3, attributes: { b0: 24, b1: 28, b2: 30 } }),
      ],
      profile,
      NOW,
    );

    const stats = getSoilBandStats(probes, profile);
    expect(stats.map((band) => band.band)).toEqual([0, 1, 2]);
    expect(stats[0]).toMatchObject({ count: 3, min: 20, median: 22, max: 24 });
    // Band 2 has a sentinel on one probe: it is excluded, not counted as zero.
    expect(stats[2]).toMatchObject({ count: 2, min: 26, median: 28, max: 30 });
  });

  it("omits a band no probe reports rather than showing an empty row", () => {
    const probes = getSoilProbeReadings(
      [sensor({ attributes: { b0: 20, b1: -328, b2: 22 } })],
      profile,
      NOW,
    );
    expect(getSoilBandStats(probes, profile).map((band) => band.band)).toEqual([0, 2]);
  });
});
