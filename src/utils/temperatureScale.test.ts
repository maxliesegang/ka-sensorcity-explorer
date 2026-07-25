import { describe, expect, it } from "vitest";

import {
  buildAbsoluteTemperatureScale,
  buildAdaptiveTemperatureScale,
} from "./temperatureScale";

describe("buildAdaptiveTemperatureScale", () => {
  it("stretches a bunched live range to reveal current differences", () => {
    const bunched = buildAdaptiveTemperatureScale([24, 25, 26]);
    const wide = buildAdaptiveTemperatureScale([-5, 25, 40]);
    expect(bunched.css(24)).not.toBe(bunched.css(26));
    expect(bunched.css(24)).not.toBe(wide.css(24));
  });

  it("orders the spectrum cold -> hot (cold is bluer, hot is redder)", () => {
    const scale = buildAdaptiveTemperatureScale([0, 35]);
    const [rCold, , bCold] = scale.rgb(0);
    const [rHot, , bHot] = scale.rgb(35);
    expect(bCold).toBeGreaterThan(rCold);
    expect(rHot).toBeGreaterThan(bHot);
  });

  it("labels the legend with the live data range, not the fixed domain", () => {
    const scale = buildAdaptiveTemperatureScale([22, 28, 25]);
    expect(scale.min).toBe(22);
    expect(scale.max).toBe(28);
    const stops = scale.stops(3);
    expect(stops[0].temperature).toBe(22);
    expect(stops[2].temperature).toBe(28);
    expect(stops[0].css).toBe(scale.css(22));
    expect(stops[2].css).toBe(scale.css(28));
  });
});

describe("buildAbsoluteTemperatureScale", () => {
  it("maps a temperature to the same colour regardless of the value set", () => {
    const bunched = buildAbsoluteTemperatureScale([24, 25, 26]);
    const wide = buildAbsoluteTemperatureScale([-5, 25, 40]);
    expect(bunched.css(25)).toBe(wide.css(25));
  });

  it("clamps temperatures outside the fixed domain to the ramp ends", () => {
    const scale = buildAbsoluteTemperatureScale([20]);
    expect(scale.css(-50)).toBe(scale.css(-5));
    expect(scale.css(80)).toBe(scale.css(40));
  });
});
