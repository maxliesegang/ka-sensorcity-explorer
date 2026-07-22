// Diverging colour scale for temperature *differences* (Δ°C) from a baseline.
//
// Unlike the temperature scales in temperatureScale.ts (hue anchored to temperature),
// this scale is diverging around 0: cooler-than-baseline = blue, ~0 = neutral
// near-white, warmer-than-baseline = red.
//
// Rather than stretching each end to the data's exact extreme (which makes a
// fraction-of-a-degree spread look dramatic and shifts colours every time the
// window changes), the scale is *stabilised* and *symmetric*: both sides span
// the larger of |min| and |max| (floored at MIN_HALF_SPAN), so equal warm/cool
// deviations always read with equal colour intensity and Δ=0 (the baseline
// itself) sits exactly at the neutral white centre.

import { clamp01, hexToRgb, rgbToCss, sampleRamp, type Rgb } from "./colorRamp";

// RdBu reversed (cold -> hot), symmetric around the near-white centre. Trimmed
// from the RdYlBu ramp in temperatureScale.ts to a clean blue -> white -> red diverging
// ramp anchored on #2166ac (strong blue) and #b2182b (strong red).
const RAMP_HEX = [
  "#2166ac",
  "#4393c3",
  "#92c5de",
  "#d1e5f0",
  "#f7f7f7",
  "#fddbc7",
  "#f4a582",
  "#d6604d",
  "#b2182b",
];

const RAMP_RGB: Rgb[] = RAMP_HEX.map(hexToRgb);

/** Sample the master diverging ramp at u (clamped to [0,1]). */
function masterRamp(u: number): Rgb {
  return sampleRamp(RAMP_RGB, u);
}

export interface TemperatureDeviationScale {
  /** Bluest (coldest) Δ shown on the bar; always -max by symmetry. */
  min: number;
  /** Reddest (warmest) Δ shown on the bar (the half-span). */
  max: number;
  /** Position of Δ=0 (the baseline) along the bar — always 0.5 (centred). */
  zeroPos: number;
  css(delta: number): string; // "rgb(r, g, b)"
  rgb(delta: number): Rgb; // 0..255 each
  /** n legend samples spanning min..max, evenly spaced (pos 0..1). */
  stops(n: number): Array<{ pos: number; delta: number; css: string }>;
}

// Smallest the half-span ever shrinks to (Δ°C). Keeps a sub-degree spread from
// being stretched across the full blue→red ramp, so small differences read as
// small.
const MIN_HALF_SPAN = 2;

/**
 * Build a stabilised, symmetric diverging deviation scale from the current
 * data's Δ range (`dataMin`..`dataMax`). Both ends span the larger of |dataMin|
 * and |dataMax|, floored at MIN_HALF_SPAN, so the bar is mirror-symmetric about
 * Δ=0 (the baseline), which sits at the neutral white centre. Out-of-range
 * deltas clamp to the ends.
 */
export function buildTemperatureDeviationScale(
  dataMin: number,
  dataMax: number,
): TemperatureDeviationScale {
  const halfSpan = Math.max(Math.abs(dataMin), Math.abs(dataMax), MIN_HALF_SPAN);

  // Map Δ∈[-halfSpan, +halfSpan] onto the ramp position u∈[0,1], with Δ=0 at the
  // 0.5 (white) centre; out-of-range deltas clamp to the ends.
  function rgb(delta: number): Rgb {
    return masterRamp(clamp01(0.5 + 0.5 * (delta / halfSpan)));
  }

  function css(delta: number): string {
    return rgbToCss(rgb(delta));
  }

  function stops(n: number): Array<{ pos: number; delta: number; css: string }> {
    const out: Array<{ pos: number; delta: number; css: string }> = [];
    for (let i = 0; i < n; i++) {
      const pos = n > 1 ? i / (n - 1) : 0;
      const delta = -halfSpan + pos * (2 * halfSpan);
      out.push({ pos, delta, css: css(delta) });
    }
    return out;
  }

  return { min: -halfSpan, max: halfSpan, zeroPos: 0.5, css, rgb, stops };
}
