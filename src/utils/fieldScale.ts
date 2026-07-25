// What a map field needs from a colour scale to draw and explain itself, and the
// one place the value-vs-deviation branching lives.
//
// Every field (live temperature, the community blend, the historical replay,
// soil) builds its colours from a quantity-specific ramp — the hue-anchored
// temperature spectrum, the diverging Δ°C ramp, the soil depth ramps. `FieldScale`
// is the presentation-ready shape they all reduce to, so `FieldLegend` renders one
// type instead of a union per quantity, and adding a quantity means adding a ramp
// rather than a legend variant.
//
// Deliberately *not* here: what a value means. A `FieldScale` carries no unit and
// no idea whether its numbers are readings or differences — the view supplies the
// formatters (see `buildFieldValueAccessors`).

import { gradientFromStops } from "./colorRamp";

/** How many samples a gradient needs to read as a smooth bar. */
const LEGEND_STOPS = 12;

export interface FieldScale {
  min: number;
  max: number;
  /**
   * Position of the neutral centre along the bar (0..1) for a diverging scale,
   * or null for a sequential one — what tells the legend whether to draw a zero
   * tick.
   */
  zeroPos: number | null;
  css(value: number): string;
  /** Left-to-right `linear-gradient` across the whole domain, for the legend. */
  gradient: string;
}

/** A ramp scale that samples its own legend stops (the temperature scales). */
interface StopSamplingScale {
  min: number;
  max: number;
  css(value: number): string;
  stops(n: number): ReadonlyArray<{ pos: number; css: string }>;
}

/** A ramp scale that already publishes a gradient (the depth-profile scales). */
interface GradientScale {
  min: number;
  max: number;
  css(value: number): string;
  gradient: string;
}

/** Adapt a stop-sampling ramp scale, rendering its gradient at legend resolution. */
export function fieldScaleFromStops(
  scale: StopSamplingScale,
  zeroPos: number | null,
): FieldScale {
  return {
    min: scale.min,
    max: scale.max,
    zeroPos,
    css: scale.css,
    gradient: gradientFromStops(scale.stops(LEGEND_STOPS)),
  };
}

/** Adapt a ramp scale that already carries its own gradient. */
export function fieldScaleFromGradient(
  scale: GradientScale,
  zeroPos: number | null,
): FieldScale {
  return {
    min: scale.min,
    max: scale.max,
    zeroPos,
    css: scale.css,
    gradient: scale.gradient,
  };
}

/** The colour and label a field gives one reading, in the active display mode. */
export interface FieldValueAccessors {
  getColor: (value: number) => string;
  formatLabel: (value: number) => string;
}

/**
 * Resolve the display mode once, into a colour and a label accessor that take a
 * raw reading. Deviation mode wins whenever both its scale and a baseline
 * resolved; otherwise readings are drawn on `valueScale`.
 *
 * Fields with a single active baseline value can use this so draw sites do not repeat the
 * "subtract the baseline, then pick the other scale and the other formatter"
 * branch — and none can get half of it right.
 */
export function buildFieldValueAccessors({
  valueScale,
  deviationScale,
  baselineValue,
  formatValue,
  formatDelta,
}: {
  valueScale: FieldScale | null;
  deviationScale: FieldScale | null;
  /** The baseline the deltas are taken from; null outside deviation mode. */
  baselineValue: number | null;
  formatValue: (value: number) => string;
  formatDelta: (delta: number) => string;
}): FieldValueAccessors {
  if (deviationScale && baselineValue != null) {
    return {
      getColor: (value) => deviationScale.css(value - baselineValue),
      formatLabel: (value) => formatDelta(value - baselineValue),
    };
  }
  return {
    // No scale means there is nothing to colour — the field is cleared rather
    // than drawn, so the empty string is never painted.
    getColor: (value) => (valueScale ? valueScale.css(value) : ""),
    formatLabel: formatValue,
  };
}
