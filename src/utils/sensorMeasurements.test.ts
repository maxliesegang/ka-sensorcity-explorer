import { describe, expect, it } from "vitest";

import { CATEGORIES, TEMPERATURE_CATEGORY_KEY, getCategory } from "../config/layers";
import type { Category } from "../types";
import {
  getBandNumbers,
  getDepthProfiles,
  getUnbandedMeasurements,
} from "./sensorMeasurements";

describe("getDepthProfiles", () => {
  it("returns a category's banded families", () => {
    const soil = getCategory("Boden-Sensor") as Category;

    expect(getDepthProfiles(soil).map((p) => p.key)).toEqual([
      "soil_moisture",
      "soil_temperature",
    ]);
  });

  it("defaults to none for a category without profiles, and for none at all", () => {
    const weather = getCategory(TEMPERATURE_CATEGORY_KEY) as Category;

    expect(getDepthProfiles(weather)).toEqual([]);
    expect(getDepthProfiles(undefined)).toEqual([]);
  });
});

describe("getUnbandedMeasurements", () => {
  it("leaves nothing unbanded when every field belongs to a profile", () => {
    const soil = getCategory("Boden-Sensor") as Category;

    // The soil probe publishes nothing but banded fields, so a leftover here
    // means a measurement is being rendered twice — once per form.
    expect(getUnbandedMeasurements(soil)).toEqual([]);
  });

  it("leaves a category without profiles untouched", () => {
    const weather = getCategory(TEMPERATURE_CATEGORY_KEY) as Category;

    expect(getUnbandedMeasurements(weather)).toEqual(weather.measurements);
  });

  it("keeps measurements no profile covers", () => {
    const category: Category = {
      key: "Test",
      color: "#000",
      archiveLayerId: 9,
      measurements: [{ field: "banded_0" }, { field: "battery", unit: "V" }],
      depthProfiles: [
        { key: "banded", ramp: "moisture", bands: [{ field: "banded_0", band: 0 }] },
      ],
    };

    expect(getUnbandedMeasurements(category)).toEqual([
      { field: "battery", unit: "V" },
    ]);
  });

  it("handles a missing category", () => {
    expect(getUnbandedMeasurements(undefined)).toEqual([]);
  });

  it("covers every measurement exactly once, for every configured category", () => {
    for (const category of CATEGORIES) {
      const rendered = [
        ...getDepthProfiles(category).flatMap((p) => p.bands.map((b) => b.field)),
        ...getUnbandedMeasurements(category).map((m) => m.field),
      ];
      expect(new Set(rendered).size).toBe(rendered.length);
      expect(new Set(rendered)).toEqual(
        new Set(category.measurements.map((m) => m.field)),
      );
    }
  });
});

describe("getBandNumbers", () => {
  it("returns the union of band numbers, shallow→deep", () => {
    const bandNumbers = getBandNumbers([
      { key: "a", ramp: "moisture", bands: [{ field: "a2", band: 2 }, { field: "a0", band: 0 }] },
      { key: "b", ramp: "temperature", bands: [{ field: "b1", band: 1 }, { field: "b0", band: 0 }] },
    ]);

    expect(bandNumbers).toEqual([0, 1, 2]);
  });

  it("returns nothing for no profiles", () => {
    expect(getBandNumbers([])).toEqual([]);
  });
});
