import { describe, expect, it } from "vitest";

import type { Sensor } from "../types";
import { getFallbackHistorySource } from "./historySources";

function waterGauge(deviceId: string): Sensor {
  return {
    objectId: 1,
    deviceId,
    name: "Gauge",
    category: "Wasserpegel-Sensor",
    lat: null,
    lon: null,
    measuredAt: null,
    attributes: {},
  };
}

describe("getFallbackHistorySource", () => {
  it.each([
    ["109", 109],
    ["110", 110],
    ["9016", 9016],
  ])("maps water gauge %s to HVZ station %i", (deviceId, stationId) => {
    expect(getFallbackHistorySource(waterGauge(deviceId), "pegel")).toMatchObject({
      provider: "hvz",
      stationId,
    });
  });

  it("does not claim history for an unknown gauge", () => {
    expect(getFallbackHistorySource(waterGauge("missing"), "pegel")).toBeUndefined();
  });
});
