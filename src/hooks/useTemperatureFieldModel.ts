// Shared derived state for the temperature-field views (live SensorCity-only and
// the combined community blend). Both maps share the same colour scale, baseline
// / deviation selection, legend and per-cell colour+label logic — only their data
// sources and popup contents differ. Centralising the model keeps the two views
// in lock-step and is what a third temperature view would build on.

import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { fetchRheinstettenCurrent, latestObservation } from "../api/brightsky";
import { DWD_BASELINE_ID, getBaselineLabel } from "../config/temperatureBaselines";
import { useAsync } from "./useAsync";
import { useTemperatureBaselineSelection } from "./useTemperatureBaselineSelection";
import {
  formatTemperatureDeviationLabel,
  formatTemperatureLabel,
  useTemperatureFieldLabelVisibility,
} from "./useTemperatureFieldLabels";
import {
  buildTemperatureLegend,
  buildBaselineDeviationScale,
  buildTemperatureDeviationLegend,
  buildTemperatureBaselineOptions,
  resolveBaselineTemperature,
  type TemperatureBaselineReading,
  type TemperatureFieldLegendModel,
} from "../utils/temperatureFieldModel";
import {
  buildAdaptiveTemperatureScale,
  type TemperatureFieldPoint,
} from "../utils/temperatureScale";

/**
 * Derive the full temperature-field model from the points to draw and the
 * readings that can serve as a deviation baseline.
 *
 * `getColorForTemperature` / `formatLabelForTemperature` map one temperature to
 * its current-mode cell colour and optional label, so callers do not repeat the
 * temperature-vs-deviation branching at every draw site.
 */
export function useTemperatureFieldModel(
  points: readonly TemperatureFieldPoint[],
  baselineReadings: readonly TemperatureBaselineReading[],
) {
  const { t } = useTranslation("temperature");

  const baselineOptions = useMemo(
    () =>
      buildTemperatureBaselineOptions(baselineReadings, {
        dwd: t("baseline.dwdOption"),
        average: t("baseline.averageOption"),
      }),
    [baselineReadings, t],
  );

  const { displayMode, setDisplayMode, baselineId, setBaselineId } =
    useTemperatureBaselineSelection(baselineOptions);
  const [showLabels, setShowLabels] = useTemperatureFieldLabelVisibility();

  // The DWD Rheinstetten baseline is fetched lazily — only while it's selected.
  const isDwdBaselineSelected =
    displayMode === "deviation" && baselineId === DWD_BASELINE_ID;
  const dwdBaseline = useAsync(fetchRheinstettenCurrent, [], {
    enabled: isDwdBaselineSelected,
  });

  const baselineLabel = useMemo(
    () => getBaselineLabel(baselineOptions, baselineId),
    [baselineOptions, baselineId],
  );

  const dwdBaselineObservation = useMemo(
    () =>
      isDwdBaselineSelected && dwdBaseline.data
        ? latestObservation([dwdBaseline.data])
        : null,
    [isDwdBaselineSelected, dwdBaseline.data],
  );

  const baselineTemperature = useMemo(
    () =>
      resolveBaselineTemperature({
        displayMode,
        baselineId,
        readings: baselineReadings,
        dwdTemperature: dwdBaselineObservation?.temperature,
      }),
    [displayMode, baselineId, baselineReadings, dwdBaselineObservation],
  );

  const isDeviationModeActive =
    displayMode === "deviation" && baselineTemperature != null;
  // True when the user asked for deviation but no baseline reading resolved.
  const isBaselineTemperatureUnavailable =
    displayMode === "deviation" && baselineTemperature == null;

  const adaptiveTemperatureScale = useMemo(
    () => (points.length > 0 ? buildAdaptiveTemperatureScale(points) : null),
    [points],
  );
  const deviationScale = useMemo(
    () =>
      isDeviationModeActive
        ? buildBaselineDeviationScale(points, baselineTemperature)
        : null,
    [isDeviationModeActive, points, baselineTemperature],
  );

  const legendModel = useMemo<TemperatureFieldLegendModel | null>(() => {
    if (!adaptiveTemperatureScale) return null;
    return deviationScale
      ? buildTemperatureDeviationLegend(deviationScale)
      : buildTemperatureLegend(adaptiveTemperatureScale, points.length);
  }, [adaptiveTemperatureScale, deviationScale, points.length]);

  // Cell colour for a temperature: deviation from the baseline when active,
  // otherwise the adaptive live temperature scale.
  const getColorForTemperature = useCallback(
    (temperature: number): string => {
      if (deviationScale && baselineTemperature != null) {
        return deviationScale.css(temperature - baselineTemperature);
      }
      return adaptiveTemperatureScale ? adaptiveTemperatureScale.css(temperature) : "";
    },
    [deviationScale, baselineTemperature, adaptiveTemperatureScale],
  );

  // Per-cell label for a temperature, matching the active display mode. Callers
  // gate on `showLabels` (omitting the label callback entirely when off).
  const formatLabelForTemperature = useCallback(
    (temperature: number): string =>
      deviationScale && baselineTemperature != null
        ? formatTemperatureDeviationLabel(temperature - baselineTemperature)
        : formatTemperatureLabel(temperature),
    [deviationScale, baselineTemperature],
  );

  return {
    displayMode,
    setDisplayMode,
    baselineId,
    setBaselineId,
    showLabels,
    setShowLabels,
    baselineOptions,
    baselineLabel,
    isDwdBaselineSelected,
    isDeviationModeActive,
    isBaselineTemperatureUnavailable,
    dwdBaselineError: dwdBaseline.error,
    dwdBaselineObservation,
    baselineTemperature,
    adaptiveTemperatureScale,
    deviationScale,
    legendModel,
    getColorForTemperature,
    formatLabelForTemperature,
  };
}
