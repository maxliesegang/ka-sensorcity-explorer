// Derived state for the soil field map: which quantity and depth band are shown,
// what the colours mean, and everything the legend and status line need.
//
// The soil analogue of useTemperatureFieldModel, with two differences that are
// the whole point of a separate page. The selection carries a *band*, and the
// colour scales span every band at once so switching band compares depths rather
// than re-normalising the map. And the deviation baseline is a column — one value
// per band, compared at the same depth — offering the city average or another
// probe, but never DWD Rheinstetten, which measures air.

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  AVERAGE_BASELINE_ID,
  buildBaselineOptions,
  getBaselineLabel,
} from "../config/temperatureBaselines";
import type { DepthProfile } from "../types";
import {
  getSoilDeviationDeltas,
  resolveSoilBaselineValues,
} from "../utils/soilFieldBaseline";
import { formatSoilDelta, formatSoilValue } from "../utils/soilFieldFormat";
import type { SoilProbeReading } from "../utils/soilFieldReadings";
import { getSoilFieldValues } from "../utils/soilFieldReadings";
import {
  buildFieldValueAccessors,
  type FieldScale,
} from "../utils/fieldScale";
import {
  buildSoilDeviationScale,
  buildSoilValueScale,
} from "../utils/soilFieldScale";
import { useFieldBaselineSelection } from "./useFieldBaselineSelection";
import { useFieldLabelVisibility } from "./useFieldLabelVisibility";

/**
 * Derive the soil field's model from the probes on screen, the quantity they
 * report and the band being drawn.
 *
 * `getColorForValue` / `formatLabelForValue` take a value already read at
 * `bandIndex`, so callers never repeat the value-vs-deviation branching.
 */
export function useSoilFieldModel(
  probes: readonly SoilProbeReading[],
  profile: DepthProfile,
  bandIndex: number,
) {
  const { t } = useTranslation("soil");

  const baselineOptions = useMemo(
    () =>
      buildBaselineOptions(
        probes.flatMap((probe) =>
          probe.bandValues[bandIndex] == null
            ? []
            : [{ id: String(probe.sensor.objectId), label: probe.sensor.name }],
        ),
        { [AVERAGE_BASELINE_ID]: t("baseline.averageOption") },
      ),
    [bandIndex, probes, t],
  );

  const { displayMode, setDisplayMode, baselineId, setBaselineId, selectBaseline } =
    useFieldBaselineSelection(baselineOptions);
  const [showLabels, setShowLabels] = useFieldLabelVisibility();

  const baselineLabel = useMemo(
    () => getBaselineLabel(baselineOptions, baselineId),
    [baselineOptions, baselineId],
  );

  const baselineValues = useMemo(
    () =>
      resolveSoilBaselineValues({
        displayMode,
        baselineId,
        probes,
        bandCount: profile.bands.length,
      }),
    [displayMode, baselineId, probes, profile.bands.length],
  );

  // The baseline for the band on screen. A probe can report some bands and not
  // others, so a baseline that resolved may still have nothing at this depth.
  const baselineValue = baselineValues?.[bandIndex] ?? null;
  const isDeviationModeActive =
    displayMode === "deviation" && baselineValue != null;
  const isBaselineValueUnavailable =
    displayMode === "deviation" && baselineValue == null;

  const valueScale = useMemo(
    () => buildSoilValueScale(profile.ramp, getSoilFieldValues(probes)),
    [profile.ramp, probes],
  );

  const deviationScale = useMemo(() => {
    if (!isDeviationModeActive || !baselineValues) return null;
    return buildSoilDeviationScale(
      profile.ramp,
      getSoilDeviationDeltas(probes, baselineValues),
    );
  }, [isDeviationModeActive, baselineValues, probes, profile.ramp]);

  const scale: FieldScale | null = deviationScale ?? valueScale;
  const valueAccessors = useMemo(
    () =>
      buildFieldValueAccessors({
        valueScale,
        deviationScale,
        baselineValue,
        formatValue: (value) => formatSoilValue(profile, value),
        formatDelta: (delta) => formatSoilDelta(profile, delta),
      }),
    [valueScale, deviationScale, baselineValue, profile],
  );

  return {
    displayMode,
    setDisplayMode,
    baselineId,
    setBaselineId,
    selectBaseline,
    baselineOptions,
    baselineLabel,
    baselineValue,
    showLabels,
    setShowLabels,
    isDeviationModeActive,
    isBaselineValueUnavailable,
    valueScale,
    deviationScale,
    /** The scale the map is drawing with — the deviation one when it's active. */
    scale,
    getColorForValue: valueAccessors.getColor,
    formatLabelForValue: valueAccessors.formatLabel,
  };
}
