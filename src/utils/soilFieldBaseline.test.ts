import { describe, expect, it } from "vitest";

import { AVERAGE_BASELINE_ID } from "../config/temperatureBaselines";
import type { Sensor } from "../types";
import {
  getSoilDeviationDeltas,
  resolveSoilBaselineValues,
} from "./soilFieldBaseline";
import type { SoilProbeReading } from "./soilFieldReadings";

function probe(objectId: number, bandValues: (number | null)[]): SoilProbeReading {
  return {
    lat: 49,
    lon: 8.4,
    bandValues,
    sensor: { objectId, name: `probe ${objectId}` } as Sensor,
  };
}

const probes = [probe(1, [20, 24, null]), probe(2, [22, 26, 30])];

describe("resolveSoilBaselineValues", () => {
  it("resolves nothing outside deviation mode", () => {
    expect(
      resolveSoilBaselineValues({
        displayMode: "value",
        baselineId: "1",
        probes,
        bandCount: 3,
      }),
    ).toBeNull();
  });

  it("averages each band separately, ignoring bands a probe misses", () => {
    expect(
      resolveSoilBaselineValues({
        displayMode: "deviation",
        baselineId: AVERAGE_BASELINE_ID,
        probes,
        bandCount: 3,
      }),
    ).toEqual([21, 25, 30]);
  });

  it("takes a chosen probe's own column", () => {
    expect(
      resolveSoilBaselineValues({
        displayMode: "deviation",
        baselineId: "1",
        probes,
        bandCount: 3,
      }),
    ).toEqual([20, 24, null]);
  });

  it("keeps a slot per declared band so band indices stay aligned", () => {
    const values = resolveSoilBaselineValues({
      displayMode: "deviation",
      baselineId: AVERAGE_BASELINE_ID,
      probes: [probe(1, [20])],
      bandCount: 3,
    });
    expect(values).toEqual([20, null, null]);
  });

  it("resolves nothing for a baseline that is not on the map", () => {
    expect(
      resolveSoilBaselineValues({
        displayMode: "deviation",
        baselineId: "99",
        probes,
        bandCount: 3,
      }),
    ).toBeNull();
  });
});

describe("getSoilDeviationDeltas", () => {
  it("compares every band against the baseline at the same depth", () => {
    expect(getSoilDeviationDeltas(probes, [20, 24, 30])).toEqual([0, 0, 2, 2, 0]);
  });

  it("skips a band the baseline has no value for", () => {
    expect(getSoilDeviationDeltas(probes, [20, null, 30])).toEqual([0, 2, 0]);
  });
});
