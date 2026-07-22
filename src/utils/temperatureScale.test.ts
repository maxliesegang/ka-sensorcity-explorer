import { describe, expect, it } from "vitest";

import { buildTemperatureScale, type TemperatureFieldPoint } from "./temperatureScale";

function point(temperature: number): TemperatureFieldPoint {
  return { lat: 49, lon: 8, temperature };
}

describe("buildTemperatureScale", () => {
  it("maps a temperature to the same colour regardless of the point set", () => {
    // The defining property of the absolute scale: colour depends only on the
    // temperature and the fixed domain, never on the live spread. A bunched
    // hot-day set and a wide set must paint 25 °C identically.
    const bunched = buildTemperatureScale([point(24), point(25), point(26)]);
    const wide = buildTemperatureScale([point(-5), point(25), point(40)]);
    expect(bunched.css(25)).toBe(wide.css(25));
  });

  it("orders the spectrum cold -> hot (cold is bluer, hot is redder)", () => {
    const scale = buildTemperatureScale([point(0), point(35)]);
    const [rCold, , bCold] = scale.rgb(0);
    const [rHot, , bHot] = scale.rgb(35);
    expect(bCold).toBeGreaterThan(rCold);
    expect(rHot).toBeGreaterThan(bHot);
  });

  it("clamps temperatures outside the fixed domain to the ramp ends", () => {
    const scale = buildTemperatureScale([point(20)]);
    expect(scale.css(-50)).toBe(scale.css(-5));
    expect(scale.css(80)).toBe(scale.css(40));
  });

  it("labels the legend with the live data range, not the fixed domain", () => {
    const scale = buildTemperatureScale([point(22), point(28), point(25)]);
    expect(scale.min).toBe(22);
    expect(scale.max).toBe(28);
    const stops = scale.stops(3);
    expect(stops[0].temperature).toBe(22);
    expect(stops[2].temperature).toBe(28);
    // Stop colours are the absolute mapping of those live temperatures.
    expect(stops[0].css).toBe(scale.css(22));
    expect(stops[2].css).toBe(scale.css(28));
  });
});
