// Temperature color scale for the live temperature field.
//
// An anchored-relative "two-knob" color scale: hue is anchored to the absolute
// temperature (so warm areas never look blue) while the live min..max range is
// stretched across a minimum window so nearby values always stay distinguishable.

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

// RdYlBu reversed (cold -> hot) at evenly spaced positions 0.0,0.1,...,1.0.
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

const RAMP_RGB: [number, number, number][] = RAMP_HEX.map((h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]);

// Absolute domain anchoring hue to real temperature (°C).
const D_MIN = -5;
const D_MAX = 40;
// Minimum width of the colour window on the master ramp. Larger = more colour
// contrast when the live readings are bunched together (e.g. a hot summer day
// where every sensor sits within a few degrees). Kept within the warm half of
// the ramp so closely-spaced warm readings still never tip into blue.
const MIN_SPAN = 0.34;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Sample the master RdYlBu-reversed ramp at u (clamped to [0,1]). */
function masterRamp(u: number): [number, number, number] {
  const t = clamp01(u) * (RAMP_RGB.length - 1);
  const i = Math.min(Math.floor(t), RAMP_RGB.length - 2);
  const f = t - i;
  const a = RAMP_RGB[i];
  const b = RAMP_RGB[i + 1];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

/** Absolute position of a temperature within the fixed domain, clamped to [0,1]. */
function absPos(temperature: number): number {
  return clamp01((temperature - D_MIN) / (D_MAX - D_MIN));
}

/** Build an anchored-relative temperature scale from the live points. */
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

  // Anchor hue window to real temperature, then guarantee a minimum span.
  const a0 = absPos(min);
  const a1 = absPos(max);
  let s0 = a0;
  let s1 = a1;
  if (s1 - s0 < MIN_SPAN) {
    const mid = (a0 + a1) / 2;
    s0 = mid - MIN_SPAN / 2;
    s1 = mid + MIN_SPAN / 2;
    // Shift the window inward if it overflows an edge, preserving width.
    if (s0 < 0) {
      s1 -= s0;
      s0 = 0;
    }
    if (s1 > 1) {
      s0 -= s1 - 1;
      s1 = 1;
    }
    s0 = clamp01(s0);
    s1 = clamp01(s1);
  }

  const span = max - min;

  function rgb(temperature: number): [number, number, number] {
    const f = span > 0 ? clamp01((temperature - min) / span) : 0.5;
    const u = s0 + f * (s1 - s0);
    return masterRamp(u);
  }

  function css(temperature: number): string {
    const [r, g, b] = rgb(temperature);
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

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
