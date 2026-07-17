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
  buildAbsoluteTemperatureLegend,
  buildBaselineDeviationScale,
  buildDeviationTemperatureLegend,
  buildTemperatureBaselineOptions,
  resolveBaselineTemperature,
  type TemperatureBaselineReading,
  type TemperatureLegendModel,
} from "../utils/temperatureFieldModel";
import {
  buildTemperatureScale,
  type TemperatureFieldPoint,
} from "../utils/temperatureScale";

/**
 * Derive the full temperature-field model from the points to draw and the
 * readings that can serve as a deviation baseline.
 *
 * `colorFor` / `labelFor` map a single temperature to its current-mode cell
 * colour and (opt-in) value label, so callers don't repeat the absolute-vs-
 * deviation branching at every draw site.
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

  const { mode, setMode, baselineId, setBaselineId } =
    useTemperatureBaselineSelection(baselineOptions);
  const [showLabels, setShowLabels] = useTemperatureFieldLabelVisibility();

  // The DWD Rheinstetten baseline is fetched lazily — only while it's selected.
  const isDwdBaselineSelected = mode === "deviation" && baselineId === DWD_BASELINE_ID;
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
        mode,
        baselineId,
        readings: baselineReadings,
        dwdTemperature: dwdBaselineObservation?.temperature,
      }),
    [mode, baselineId, baselineReadings, dwdBaselineObservation],
  );

  const isDeviationMapActive = mode === "deviation" && baselineTemperature != null;
  // True when the user asked for deviation but no baseline reading resolved.
  const isBaselineTemperatureUnavailable =
    mode === "deviation" && baselineTemperature == null;

  const temperatureScale = useMemo(
    () => (points.length > 0 ? buildTemperatureScale(points) : null),
    [points],
  );
  const baselineDeviationScale = useMemo(
    () =>
      isDeviationMapActive
        ? buildBaselineDeviationScale(points, baselineTemperature)
        : null,
    [isDeviationMapActive, points, baselineTemperature],
  );

  const legend = useMemo<TemperatureLegendModel | null>(() => {
    if (!temperatureScale) return null;
    return baselineDeviationScale
      ? buildDeviationTemperatureLegend(baselineDeviationScale)
      : buildAbsoluteTemperatureLegend(temperatureScale, points.length);
  }, [temperatureScale, baselineDeviationScale, points.length]);

  // Cell colour for a temperature: deviation from the baseline when active,
  // otherwise the absolute scale.
  const colorFor = useCallback(
    (temperature: number): string => {
      if (baselineDeviationScale && baselineTemperature != null) {
        return baselineDeviationScale.css(temperature - baselineTemperature);
      }
      return temperatureScale ? temperatureScale.css(temperature) : "";
    },
    [baselineDeviationScale, baselineTemperature, temperatureScale],
  );

  // Per-cell label for a temperature, matching the active colour mode. Callers
  // gate on `showLabels` (omitting the label callback entirely when off).
  const labelFor = useCallback(
    (temperature: number): string =>
      baselineDeviationScale && baselineTemperature != null
        ? formatTemperatureDeviationLabel(temperature - baselineTemperature)
        : formatTemperatureLabel(temperature),
    [baselineDeviationScale, baselineTemperature],
  );

  return {
    mode,
    setMode,
    baselineId,
    setBaselineId,
    showLabels,
    setShowLabels,
    baselineOptions,
    baselineLabel,
    isDwdBaselineSelected,
    isDeviationMapActive,
    isBaselineTemperatureUnavailable,
    dwdBaselineError: dwdBaseline.error,
    dwdBaselineObservation,
    baselineTemperature,
    temperatureScale,
    baselineDeviationScale,
    legend,
    colorFor,
    labelFor,
  };
}
