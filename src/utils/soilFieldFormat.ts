// Rendering soil readings for display.
//
// The two quantities want different precision: a tenth of a degree is a real
// difference between two probes, a tenth of a percentage point of moisture is
// noise. Keeping that in one place means the map labels, the popup column, the
// per-band summary and the status line all round the same way.

import type { DepthProfile, DepthProfileRamp } from "../types";

const DECIMALS: Record<DepthProfileRamp, number> = {
  temperature: 1,
  moisture: 0,
};

/** A reading with its unit, e.g. "23.5 °C" or "34 %". */
export function formatSoilValue(profile: DepthProfile, value: number): string {
  return formatSoilNumber(profile, value);
}

function formatSoilNumber(
  profile: DepthProfile,
  value: number,
  includePositiveSign = false,
): string {
  const decimals = DECIMALS[profile.ramp];
  // Probes read a shade below zero when soil is bone dry, and rounding that to
  // "-0 %" reads as a broken sensor rather than as dry ground.
  const rounded = value.toFixed(decimals);
  const numeric = Number(rounded);
  const formatted = numeric === 0
    ? (0).toFixed(decimals)
    : `${includePositiveSign && numeric > 0 ? "+" : ""}${rounded}`;
  return profile.unit ? `${formatted} ${profile.unit}` : formatted;
}

/** A same-depth difference from the baseline, e.g. "+1.3 °C", "-4 %". */
export function formatSoilDelta(profile: DepthProfile, delta: number): string {
  return formatSoilNumber(profile, delta, true);
}
