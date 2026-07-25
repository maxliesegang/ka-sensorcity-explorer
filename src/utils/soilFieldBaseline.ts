// Baseline resolution for the soil field's deviation mode.
//
// A soil baseline is a *column*, not a number: a probe reports one value per
// depth band, and comparing a band against a baseline's other band would mix
// depths. So the baseline resolves to one value per band and every difference is
// taken at the same depth.

import { AVERAGE_BASELINE_ID } from "../config/temperatureBaselines";
import type { FieldDisplayMode } from "../types";
import type { SoilProbeReading } from "./soilFieldReadings";
import { mean } from "./stats";

/** Per-band baseline values, parallel to the profile's `bands`; null where none. */
export type SoilBaselineValues = readonly (number | null)[];

/**
 * The baseline column for the current selection, or null when deviation mode is
 * off or nothing resolves. `bandCount` comes from the profile, so a band no
 * probe reports still holds its slot (as null) and band indices stay aligned.
 */
export function resolveSoilBaselineValues({
  displayMode,
  baselineId,
  probes,
  bandCount,
}: {
  displayMode: FieldDisplayMode;
  baselineId: string | null;
  probes: readonly SoilProbeReading[];
  bandCount: number;
}): SoilBaselineValues | null {
  if (displayMode !== "deviation" || baselineId == null) return null;

  if (baselineId === AVERAGE_BASELINE_ID) {
    return Array.from({ length: bandCount }, (_unused, bandIndex) =>
      mean(
        probes.flatMap((probe) => {
          const value = probe.bandValues[bandIndex];
          return value != null ? [value] : [];
        }),
      ),
    );
  }

  const baselineProbe = probes.find(
    (probe) => String(probe.sensor.objectId) === baselineId,
  );
  return baselineProbe ? baselineProbe.bandValues : null;
}

/**
 * Every same-depth difference from the baseline across all bands — the domain
 * the deviation colour scale spans, so its zero point and intensities hold while
 * switching band.
 */
export function getSoilDeviationDeltas(
  probes: readonly SoilProbeReading[],
  baselineValues: SoilBaselineValues,
): number[] {
  const deltas: number[] = [];
  for (const probe of probes) {
    probe.bandValues.forEach((value, bandIndex) => {
      const baselineValue = baselineValues[bandIndex];
      if (value == null || baselineValue == null) return;
      deltas.push(value - baselineValue);
    });
  }
  return deltas;
}
