// Sequential colour scales for the depth-profile heatmap.
//
// A heatmap cell encodes magnitude, so each ramp is a single hue stepped
// light→dark: lightness carries "how much" and the hue only says which quantity
// is on screen. (The live temperature field's scale is a different job — it
// spreads a diverging ramp across a spatial field — so the two don't share a
// ramp.) The steps are fixed rather than theme-aware for the same reason the
// category colours are: they are read directly in JS, as SVG fills and CSS
// gradients, where a theme variable can't reach.

import type { DepthProfileRamp } from "../types";
import {
  clamp01,
  hexToRgb,
  rampGradient,
  rgbToCss,
  sampleRamp,
  type Rgb,
} from "./colorRamp";

// Both ramps are monotone in lightness with a single hue (verified: hue spread
// ≤ 5°, every adjacent lightness gap ≥ 0.06 OKLCH). The lightest step sits close
// to the light surface by design — on a sequential ramp the low end should
// recede — so the legend, the hover readout and the data table, not the fill
// alone, are what make a near-zero cell readable.
const RAMP_HEX: Record<DepthProfileRamp, string[]> = {
  // Blue: dry → wet.
  moisture: ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"],
  // Warm: cool → warm, keeping temperature's conventional hue.
  temperature: ["#fbdedd", "#f6bcba", "#ef9694", "#e56b6a", "#d43f3e", "#a82f2f", "#7a2020"],
};

const RAMP_RGB: Record<DepthProfileRamp, Rgb[]> = {
  moisture: RAMP_HEX.moisture.map(hexToRgb),
  temperature: RAMP_HEX.temperature.map(hexToRgb),
};

export interface DepthProfileScale {
  min: number;
  max: number;
  /** Fill for a value, clamped to the min..max domain. */
  css(value: number): string;
  /** Left-to-right `linear-gradient` across the whole domain, for the legend. */
  gradient: string;
}

/**
 * Build a sequential scale over the observed `min`..`max` of one profile. The
 * domain is the data's own range rather than a fixed one: a probe's readings
 * span a few percent or a few degrees, and a fixed domain would flatten that to
 * a single colour.
 */
export function buildDepthProfileScale(
  ramp: DepthProfileRamp,
  min: number,
  max: number,
): DepthProfileScale {
  const stops = RAMP_RGB[ramp];
  const span = max - min;

  function css(value: number): string {
    // A flat series has no range to spread; show it mid-ramp rather than
    // letting a divide-by-zero pick an arbitrary end.
    const u = span > 0 ? clamp01((value - min) / span) : 0.5;
    return rgbToCss(sampleRamp(stops, u));
  }

  return { min, max, css, gradient: rampGradient(stops) };
}
