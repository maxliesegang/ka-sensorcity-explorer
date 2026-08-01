import { describe, expect, it } from "vitest";

import {
  TEMPERATURE_CATEGORY_KEY,
  TEMPERATURE_FIELD_KEY,
  WATER_CATEGORY_KEY,
  WATER_LEVEL_FIELD_KEY,
} from "../config/layers";
import type { Attributes, Sensor } from "../types";
import { getCityConditions, summarizeCategoryReadings } from "./cityConditions";

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;

function sensor(overrides: Partial<Sensor> & { attributes?: Attributes } = {}): Sensor {
  return {
    objectId: 1,
    deviceId: "device-1",
    name: "001 - Somewhere",
    category: TEMPERATURE_CATEGORY_KEY,
    lat: 49,
    lon: 8.4,
    measuredAt: NOW - 60_000,
    attributes: {},
    ...overrides,
  };
}

function weather(objectId: number, attributes: Attributes, measuredAt = NOW - 60_000): Sensor {
  return sensor({ objectId, name: `00${objectId} - Street`, attributes, measuredAt });
}

describe("getCityConditions", () => {
  it("summarizes temperature over every reporting sensor, not just one", () => {
    const conditions = getCityConditions(
      [
        weather(1, { [TEMPERATURE_FIELD_KEY]: 20 }),
        weather(2, { [TEMPERATURE_FIELD_KEY]: 24 }),
        weather(3, { [TEMPERATURE_FIELD_KEY]: 28 }),
      ],
      NOW,
    );

    expect(conditions.temperature).toMatchObject({
      median: 24,
      min: 20,
      max: 28,
      count: 3,
    });
    expect(conditions.temperature?.warmest.objectId).toBe(3);
    expect(conditions.temperature?.coolest.objectId).toBe(1);
  });

  it("ignores readings older than the freshness window", () => {
    const conditions = getCityConditions(
      [
        weather(1, { [TEMPERATURE_FIELD_KEY]: 20 }),
        weather(2, { [TEMPERATURE_FIELD_KEY]: 40 }, NOW - 5 * HOUR),
      ],
      NOW,
    );

    expect(conditions.temperature).toMatchObject({ median: 20, max: 20, count: 1 });
  });

  it("returns null for a quantity nothing currently reports", () => {
    const conditions = getCityConditions([weather(1, { irrelevant: 1 })], NOW);

    expect(conditions.temperature).toBeNull();
    expect(conditions.water).toBeNull();
  });

  it("keeps every water gauge, whatever its age, since gauges report slowly", () => {
    const gauge = (objectId: number, value: number, measuredAt: number) =>
      sensor({
        objectId,
        category: WATER_CATEGORY_KEY,
        name: `Gauge ${objectId}`,
        attributes: { [WATER_LEVEL_FIELD_KEY]: value },
        measuredAt,
      });

    const conditions = getCityConditions(
      [gauge(1, 120, NOW - 6 * HOUR), gauge(2, 340, NOW - 8 * HOUR)],
      NOW,
    );

    // Not ranked: the gauges are on different rivers, so each is its own answer.
    expect(conditions.water?.gauges).toMatchObject([
      { objectId: 1, value: 120, measuredAt: NOW - 6 * HOUR },
      { objectId: 2, value: 340, measuredAt: NOW - 8 * HOUR },
    ]);
  });
});

describe("summarizeCategoryReadings", () => {
  const measurement = { field: TEMPERATURE_FIELD_KEY, unit: "°C" };

  it("returns the median and the range it sits in", () => {
    const result = summarizeCategoryReadings(
      [
        weather(1, { [TEMPERATURE_FIELD_KEY]: 18 }),
        weather(2, { [TEMPERATURE_FIELD_KEY]: 19 }),
        weather(3, { [TEMPERATURE_FIELD_KEY]: 30 }),
      ],
      TEMPERATURE_CATEGORY_KEY,
      measurement,
      NOW,
    );

    expect(result).toEqual({ median: 19, min: 18, max: 30, count: 3 });
  });

  it("is null without a measurement or without readings", () => {
    expect(
      summarizeCategoryReadings([], TEMPERATURE_CATEGORY_KEY, undefined, NOW),
    ).toBeNull();
    expect(
      summarizeCategoryReadings([], TEMPERATURE_CATEGORY_KEY, measurement, NOW),
    ).toBeNull();
  });

  it("keeps slow-reporting water gauges rather than dropping them as stale", () => {
    const result = summarizeCategoryReadings(
      [
        sensor({
          objectId: 9,
          category: WATER_CATEGORY_KEY,
          attributes: { [WATER_LEVEL_FIELD_KEY]: 210 },
          measuredAt: NOW - 12 * HOUR,
        }),
      ],
      WATER_CATEGORY_KEY,
      { field: WATER_LEVEL_FIELD_KEY, unit: "cm" },
      NOW,
    );

    expect(result).toEqual({ median: 210, min: 210, max: 210, count: 1 });
  });
});
