import { describe, expect, it } from "vitest";

import type { DepthProfile } from "../types";
import { formatSoilDelta, formatSoilValue } from "./soilFieldFormat";

const temperature: DepthProfile = {
  key: "soil_temperature",
  unit: "°C",
  ramp: "temperature",
  bands: [],
};
const moisture: DepthProfile = {
  key: "soil_moisture",
  unit: "%",
  ramp: "moisture",
  bands: [],
};

describe("formatSoilValue", () => {
  it("gives temperature a tenth of a degree and moisture whole points", () => {
    expect(formatSoilValue(temperature, 23.47)).toBe("23.5 °C");
    expect(formatSoilValue(moisture, 33.6)).toBe("34 %");
  });

  it("never renders a negative zero for bone-dry soil", () => {
    expect(formatSoilValue(moisture, -0.4)).toBe("0 %");
    expect(formatSoilValue(temperature, -0.02)).toBe("0.0 °C");
    expect(formatSoilValue(moisture, -1.5)).toBe("-2 %");
  });
});

describe("formatSoilDelta", () => {
  it("signs the difference and keeps the quantity's unit", () => {
    expect(formatSoilDelta(temperature, 1.34)).toBe("+1.3 °C");
    expect(formatSoilDelta(moisture, -4)).toBe("-4 %");
    expect(formatSoilDelta(moisture, 0)).toBe("0 %");
    expect(formatSoilDelta(moisture, -0.4)).toBe("0 %");
  });
});
