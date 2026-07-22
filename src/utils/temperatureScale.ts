// Temperature color scale for the live temperature field.
//
// A purely *absolute* color scale: temperature maps to colour through a fixed
// domain (D_MIN..D_MAX), so the same reading always paints the same colour, on
// every render and across every view — 25 °C is one specific orange, full stop.
// Nothing here stretches to the live min..max; when you need to resolve small
// same-day differences, the deviation ("compare to baseline") mode is the tool
// for that — it supplements, rather than distorts, this absolute reading.

import { clamp01, hexToRgb, rgbToCss, sampleRamp, type Rgb } from "./colorRamp";

export interface TemperatureFieldPoint {
  lat: number;
  lon: number;
  temperature: number;
}

export interface LegendStop {
  pos: number; // 0..1
  temperature: number;
  css: string;
}

export interface TemperatureScale {
  min: number; // live min temp across points
  max: number; // live max temp across points
  rgb(temperature: number): [number, number, number]; // 0..255 each
  css(temperature: number): string; // "rgb(r, g, b)"
  stops(n: number): LegendStop[]; // n legend samples from min..max, evenly spaced
}

export interface RasterBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Master spectrum: a carefully-ordered cold -> hot ramp sampled at evenly spaced
// positions 0.0, 0.1, ... 1.0. This is ColorBrewer's RdYlBu (reversed) — a
// perceptually smooth, colorblind-considered diverging scheme running deep
// indigo (cold) through a pale, "mild"-reading centre to deep crimson (hot). It
// is deliberately kept distinct from the RdBu blue->white->red ramp used by the
// deviation scale (see temperatureDeviationScale.ts) so the absolute and
// baseline-relative modes never look like the same picture.
const RAMP_HEX = [
  "#313695",
  "#4575b4",
  "#74add1",
  "#abd9e9",
  "#e0f3f8",
  "#ffffbf",
  "#fee090",
  "#fdae61",
  "#f46d43",
  "#d73027",
  "#a50026",
];

const RAMP_RGB: Rgb[] = RAMP_HEX.map(hexToRgb);

// The fixed absolute domain the spectrum spans (°C). Chosen to cover Karlsruhe's
// realistic year-round range with the ramp's pale centre landing on a mild
// ~17.5 °C; readings outside it clamp to the deepest indigo / crimson. Because
// this domain never moves, a given temperature keeps one colour forever — the
// whole point of the absolute scale.
const D_MIN = -5;
const D_MAX = 40;

/** Absolute position of a temperature within the fixed domain, clamped to [0,1]. */
function absPos(temperature: number): number {
  return clamp01((temperature - D_MIN) / (D_MAX - D_MIN));
}

/**
 * The absolute temperature colour, as a global pure mapping. These are the
 * single source of truth for "what colour is this reading" — a fixed function of
 * the temperature alone (mirroring `getCategoryColor`), so any view can colour a
 * value without building a scale, and every view agrees on the result.
 */
export function getTemperatureColor(temperature: number): string {
  return rgbToCss(getTemperatureColorRgb(temperature));
}

export function getTemperatureColorRgb(temperature: number): Rgb {
  return sampleRamp(RAMP_RGB, absPos(temperature));
}

/**
 * Build the absolute temperature scale. Colour comes from the global mapping
 * above — the `points` only set the live min..max the legend labels (so it still
 * reads real numbers) and the range its `stops` sample; never the colour itself.
 */
export function buildTemperatureScale(
  points: readonly TemperatureFieldPoint[],
): TemperatureScale {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    if (p.temperature < min) min = p.temperature;
    if (p.temperature > max) max = p.temperature;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = D_MIN;
    max = D_MAX;
  }

  const span = max - min;

  function stops(n: number): LegendStop[] {
    const out: LegendStop[] = [];
    for (let i = 0; i < n; i++) {
      const pos = n > 1 ? i / (n - 1) : 0;
      const temperature = min + pos * span;
      out.push({ pos, temperature, css: getTemperatureColor(temperature) });
    }
    return out;
  }

  return { min, max, rgb: getTemperatureColorRgb, css: getTemperatureColor, stops };
}
