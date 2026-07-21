// Sampling a discrete list of colour stops as a continuous ramp.
//
// Shared by the colour scales that are read directly in JS (SVG fills, map
// styles, CSS gradients) rather than through a theme-aware CSS variable.

export type Rgb = [number, number, number];

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Parse a `#rrggbb` string into 0..255 components. */
export function hexToRgb(hex: string): Rgb {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function rgbToCss([r, g, b]: Rgb): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * Sample `stops` (assumed evenly spaced) at `u`, linearly interpolating between
 * the two neighbouring stops. `u` is clamped to [0, 1], so a ramp never
 * extrapolates past the colours it declares. Requires at least two stops — every
 * ramp here is a module-level constant, so that is an authoring-time invariant
 * rather than something to re-check per sample.
 */
export function sampleRamp(stops: readonly Rgb[], u: number): Rgb {
  const t = clamp01(u) * (stops.length - 1);
  const i = Math.min(Math.floor(t), stops.length - 2);
  const f = t - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

/** Build a CSS `linear-gradient` across the ramp, sampled at `steps` points. */
export function rampGradient(
  stops: readonly Rgb[],
  steps = 12,
  direction = "to right",
): string {
  const samples: string[] = [];
  for (let i = 0; i < steps; i++) {
    const u = steps > 1 ? i / (steps - 1) : 0;
    samples.push(`${rgbToCss(sampleRamp(stops, u))} ${(u * 100).toFixed(1)}%`);
  }
  return `linear-gradient(${direction}, ${samples.join(", ")})`;
}
