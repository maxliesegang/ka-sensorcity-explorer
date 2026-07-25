// Colour scales for the soil field map.
//
// No new ramps: soil temperature borrows the temperature field's hue-anchored
// spectrum (so 25 °C of soil reads warm the way 25 °C of air does), and soil
// moisture borrows the depth-profile heatmap's sequential blue and its diverging
// dry/wet counterpart (so a probe's page and the city map agree on what "wet"
// looks like). What this module adds is the *domain*: one window spanning every
// depth band at once, so switching band compares bands instead of re-normalising
// the picture.

import {
  buildDepthProfileChangeScale,
  buildDepthProfileScale,
} from "./depthProfileScale";
import {
  fieldScaleFromGradient,
  fieldScaleFromStops,
  type FieldScale,
} from "./fieldScale";
import type { DepthProfileRamp } from "../types";
import { buildTemperatureDeviationScale } from "./temperatureDeviationScale";
import { buildAdaptiveTemperatureScale } from "./temperatureScale";

/**
 * Narrowest value window the moisture scale spans (percentage points). Soil
 * moisture legitimately sits within a few points across the whole city after
 * rain; stretching that over the full ramp would paint a uniform city as
 * dramatic. Temperature needs no equivalent floor — its own scale already
 * enforces a minimum ramp width.
 */
const MIN_MOISTURE_SPAN = 10;

/** Widen a range to at least `minSpan`, keeping its midpoint. */
function withMinimumSpan(
  min: number,
  max: number,
  minSpan: number,
): [number, number] {
  if (max - min >= minSpan) return [min, max];
  const midpoint = (min + max) / 2;
  return [midpoint - minSpan / 2, midpoint + minSpan / 2];
}

function range(values: readonly number[]): [number, number] {
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Scale for the readings themselves, spanning `values` — pass every band's
 * values, not just the selected band's, so all bands share one window.
 * Returns null for an empty set, i.e. when there is nothing to colour.
 */
export function buildSoilValueScale(
  ramp: DepthProfileRamp,
  values: readonly number[],
): FieldScale | null {
  if (values.length === 0) return null;

  if (ramp === "temperature") {
    return fieldScaleFromStops(buildAdaptiveTemperatureScale(values), null);
  }

  const [min, max] = withMinimumSpan(...range(values), MIN_MOISTURE_SPAN);
  return fieldScaleFromGradient(buildDepthProfileScale(ramp, min, max), null);
}

/**
 * Diverging scale for differences from the baseline, spanning `deltas` — again
 * every band's deltas, so the zero point and the intensity of a given difference
 * hold while switching band. Both underlying scales are symmetric about zero, so
 * the neutral centre is always mid-bar. Returns null for an empty set.
 */
export function buildSoilDeviationScale(
  ramp: DepthProfileRamp,
  deltas: readonly number[],
): FieldScale | null {
  if (deltas.length === 0) return null;
  const [dataMin, dataMax] = range(deltas);

  if (ramp === "temperature") {
    const scale = buildTemperatureDeviationScale(dataMin, dataMax);
    return fieldScaleFromStops(scale, scale.zeroPos);
  }

  return fieldScaleFromGradient(
    buildDepthProfileChangeScale(ramp, dataMin, dataMax),
    0.5,
  );
}
