// Temperature colour scales for the temperature fields. Live maps use an
// adaptive scale to reveal the current spatial spread; historical
// replay uses the fixed absolute scale so colours remain comparable over time.

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
  min: number; // minimum temperature represented by the legend
  max: number; // maximum temperature represented by the legend
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
// deviation scale (see temperatureDeviationScale.ts) so temperature and
// deviation displays never look like the same picture.
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
const ABSOLUTE_MIN_C = -5;
const ABSOLUTE_MAX_C = 40;
// Minimum width of the live colour window on the master ramp. This gives
// bunched readings enough contrast without making warm places look cold.
const MIN_ADAPTIVE_RAMP_SPAN = 0.34;

type TemperatureRange = readonly [min: number, max: number];
type RampWindow = readonly [start: number, end: number];

/** Absolute position of a temperature within the fixed domain, clamped to [0,1]. */
function absoluteRampPosition(temperature: number): number {
  return clamp01(
    (temperature - ABSOLUTE_MIN_C) / (ABSOLUTE_MAX_C - ABSOLUTE_MIN_C),
  );
}

/**
 * The absolute temperature colour, as a global pure mapping. These are the
 * single source of truth for "what colour is this reading" — a fixed function of
 * the temperature alone (mirroring `getCategoryColor`), so any view can colour a
 * value without building a scale, and every view agrees on the result.
 */
export function getAbsoluteTemperatureColor(temperature: number): string {
  return rgbToCss(getAbsoluteTemperatureColorRgb(temperature));
}

export function getAbsoluteTemperatureColorRgb(temperature: number): Rgb {
  return sampleRamp(RAMP_RGB, absoluteRampPosition(temperature));
}

function getTemperatureRange(
  points: readonly TemperatureFieldPoint[],
): TemperatureRange {
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    if (point.temperature < min) min = point.temperature;
    if (point.temperature > max) max = point.temperature;
  }
  return Number.isFinite(min) && Number.isFinite(max)
    ? [min, max]
    : [ABSOLUTE_MIN_C, ABSOLUTE_MAX_C];
}

function buildScaleForRange(
  [min, max]: TemperatureRange,
  rgb: (temperature: number) => Rgb,
): TemperatureScale {
  const span = max - min;
  const css = (temperature: number) => rgbToCss(rgb(temperature));

  function stops(n: number): LegendStop[] {
    const out: LegendStop[] = [];
    for (let i = 0; i < n; i++) {
      const pos = n > 1 ? i / (n - 1) : 0;
      const temperature = min + pos * span;
      out.push({ pos, temperature, css: css(temperature) });
    }
    return out;
  }

  return { min, max, rgb, css, stops };
}

/** Expand a live range to the minimum useful ramp width without crossing 0..1. */
function adaptiveRampWindow(
  minTemperature: number,
  maxTemperature: number,
): RampWindow {
  const absoluteMin = absoluteRampPosition(minTemperature);
  const absoluteMax = absoluteRampPosition(maxTemperature);
  if (absoluteMax - absoluteMin >= MIN_ADAPTIVE_RAMP_SPAN) {
    return [absoluteMin, absoluteMax];
  }

  const midpoint = (absoluteMin + absoluteMax) / 2;
  let min = midpoint - MIN_ADAPTIVE_RAMP_SPAN / 2;
  let max = midpoint + MIN_ADAPTIVE_RAMP_SPAN / 2;

  if (min < 0) {
    max -= min;
    min = 0;
  } else if (max > 1) {
    min -= max - 1;
    max = 1;
  }

  return [clamp01(min), clamp01(max)];
}

/**
 * Build the anchored-relative live scale. Its hue window is anchored to the
 * absolute temperatures, then expanded to a minimum width and stretched over
 * the current min..max. This preserves the meaning of warm/cold hues while
 * making small differences at one point in time visible.
 */
export function buildAdaptiveTemperatureScale(
  points: readonly TemperatureFieldPoint[],
): TemperatureScale {
  const temperatureRange = getTemperatureRange(points);
  const [min, max] = temperatureRange;
  const [rampMin, rampMax] = adaptiveRampWindow(min, max);
  const span = max - min;
  const rgb = (temperature: number): Rgb => {
    const position = span > 0 ? clamp01((temperature - min) / span) : 0.5;
    return sampleRamp(RAMP_RGB, rampMin + position * (rampMax - rampMin));
  };
  return buildScaleForRange(temperatureRange, rgb);
}

/** Build the fixed scale used when colours must be comparable across time. */
export function buildAbsoluteTemperatureScale(
  points: readonly TemperatureFieldPoint[],
): TemperatureScale {
  return buildScaleForRange(
    getTemperatureRange(points),
    getAbsoluteTemperatureColorRgb,
  );
}
