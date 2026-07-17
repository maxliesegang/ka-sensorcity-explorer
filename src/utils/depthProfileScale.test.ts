import { describe, expect, it } from "vitest";

import { buildDepthProfileChangeScale } from "./depthProfileScale";

describe("buildDepthProfileChangeScale", () => {
  it("keeps the domain symmetric around zero", () => {
    const scale = buildDepthProfileChangeScale("moisture", -3, 8);

    expect(scale.min).toBe(-8);
    expect(scale.max).toBe(8);
  });

  it("does not exaggerate a nearly flat moisture series", () => {
    const scale = buildDepthProfileChangeScale("moisture", -0.1, 0.2);

    expect(scale.min).toBe(-2);
    expect(scale.max).toBe(2);
  });

  it("maps zero to the same neutral colour for either quantity", () => {
    const moisture = buildDepthProfileChangeScale("moisture", -5, 5);
    const temperature = buildDepthProfileChangeScale("temperature", -5, 5);

    expect(moisture.css(0)).toBe(temperature.css(0));
  });
});
