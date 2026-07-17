import { describe, expect, it } from "vitest";

import { clamp01, hexToRgb, rampGradient, rgbToCss, sampleRamp, type Rgb } from "./colorRamp";

// Black → white via mid grey: interpolation is trivial to reason about, so a
// wrong stop or a wrong segment shows up as an obviously wrong number.
const RAMP: Rgb[] = [
  [0, 0, 0],
  [128, 128, 128],
  [255, 255, 255],
];

describe("clamp01", () => {
  it("passes through the unit interval and clamps outside it", () => {
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(9)).toBe(1);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
  });
});

describe("hexToRgb", () => {
  it("parses #rrggbb into 0..255 components", () => {
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#2166ac")).toEqual([0x21, 0x66, 0xac]);
  });
});

describe("rgbToCss", () => {
  it("rounds the fractional components interpolation produces", () => {
    expect(rgbToCss([0, 128, 255])).toBe("rgb(0, 128, 255)");
    expect(rgbToCss([1.4, 1.5, 254.6])).toBe("rgb(1, 2, 255)");
  });
});

describe("sampleRamp", () => {
  it("returns the exact end stops at u=0 and u=1", () => {
    // u=1 is the one that would silently fall off the end of the segment index.
    expect(sampleRamp(RAMP, 0)).toEqual([0, 0, 0]);
    expect(sampleRamp(RAMP, 1)).toEqual([255, 255, 255]);
  });

  it("interpolates linearly within a segment", () => {
    expect(sampleRamp(RAMP, 0.5)).toEqual([128, 128, 128]);
    expect(sampleRamp(RAMP, 0.25)).toEqual([64, 64, 64]);
    expect(sampleRamp(RAMP, 0.75)).toEqual([191.5, 191.5, 191.5]);
  });

  it("clamps out-of-range u to the ends rather than extrapolating", () => {
    expect(sampleRamp(RAMP, -2)).toEqual([0, 0, 0]);
    expect(sampleRamp(RAMP, 5)).toEqual([255, 255, 255]);
  });

  it("is monotonic across a monotonic ramp", () => {
    let previous = -Infinity;
    for (let u = 0; u <= 1; u += 0.05) {
      const [r] = sampleRamp(RAMP, u);
      expect(r).toBeGreaterThanOrEqual(previous);
      previous = r;
    }
  });
});

describe("rampGradient", () => {
  it("spans 0%..100% and starts and ends on the ramp's own end stops", () => {
    const gradient = rampGradient(RAMP, 3);
    expect(gradient).toBe(
      "linear-gradient(to right, rgb(0, 0, 0) 0.0%, rgb(128, 128, 128) 50.0%, rgb(255, 255, 255) 100.0%)",
    );
  });

  it("honours the direction", () => {
    expect(rampGradient(RAMP, 2, "to bottom")).toContain("linear-gradient(to bottom,");
  });
});
