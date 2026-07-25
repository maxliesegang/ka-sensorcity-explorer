import { describe, expect, it } from "vitest";

import {
  AVERAGE_BASELINE_ID,
  buildBaselineOptions,
  DWD_BASELINE_ID,
  getDefaultBaselineId,
} from "./temperatureBaselines";

const sensors = [
  { id: "2", label: "132 - Wasserwerkstrasse" },
  { id: "1", label: "004 - Am Anger" },
  { id: "1", label: "004 - Am Anger (duplicate)" },
];

describe("buildBaselineOptions", () => {
  it("offers the synthetic baselines a field has labels for, in a fixed order", () => {
    const options = buildBaselineOptions(sensors, {
      [DWD_BASELINE_ID]: "Rheinstetten",
      [AVERAGE_BASELINE_ID]: "Average",
    });
    expect(options.slice(0, 2).map((option) => option.id)).toEqual([
      DWD_BASELINE_ID,
      AVERAGE_BASELINE_ID,
    ]);
  });

  it("omits DWD for a field that does not label it (the soil field)", () => {
    const options = buildBaselineOptions(sensors, {
      [AVERAGE_BASELINE_ID]: "Average of all probes",
    });
    expect(options.map((option) => option.id)).not.toContain(DWD_BASELINE_ID);
    expect(options[0].id).toBe(AVERAGE_BASELINE_ID);
    // …and the default lands on the average rather than nothing.
    expect(getDefaultBaselineId(options)).toBe(AVERAGE_BASELINE_ID);
  });

  it("de-duplicates sensors by id and orders them by label", () => {
    const options = buildBaselineOptions(sensors, {});
    expect(options).toEqual([
      { id: "1", label: "004 - Am Anger" },
      { id: "2", label: "132 - Wasserwerkstrasse" },
    ]);
  });
});
