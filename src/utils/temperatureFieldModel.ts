import {
  AVERAGE_BASELINE_ID,
  DWD_BASELINE_ID,
} from "../config/temperatureBaselines";
import type { FieldDisplayMode } from "../types";
import { fieldScaleFromStops, type FieldScale } from "./fieldScale";
import { mean } from "./stats";
import {
  buildTemperatureDeviationScale,
  type TemperatureDeviationScale,
} from "./temperatureDeviationScale";
import type { TemperatureScale } from "./temperatureScale";

export interface TemperatureBaselineReading {
  id: string;
  label: string;
  temperature: number;
}

export type TemperatureFieldLegendModel = FieldScale &
  (
    | {
      kind: "temperature";
      count: number;
    }
    | {
      kind: "deviation";
    }
  );

export function resolveBaselineTemperature({
  displayMode,
  baselineId,
  readings,
  dwdTemperature,
}: {
  displayMode: FieldDisplayMode;
  baselineId: string | null;
  readings: readonly TemperatureBaselineReading[];
  dwdTemperature?: number | null;
}): number | null {
  if (displayMode !== "deviation" || baselineId == null) return null;
  if (baselineId === DWD_BASELINE_ID) return dwdTemperature ?? null;
  if (baselineId === AVERAGE_BASELINE_ID) {
    return mean(readings.map((reading) => reading.temperature));
  }
  return readings.find((reading) => reading.id === baselineId)?.temperature ?? null;
}

export function buildBaselineDeviationScale(
  points: readonly { temperature: number }[],
  baselineTemperature: number | null,
): TemperatureDeviationScale | null {
  if (baselineTemperature == null || points.length === 0) return null;

  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    const delta = point.temperature - baselineTemperature;
    if (delta < min) min = delta;
    if (delta > max) max = delta;
  }
  return Number.isFinite(min) && Number.isFinite(max)
    ? buildTemperatureDeviationScale(min, max)
    : null;
}

export function buildTemperatureLegend(
  scale: TemperatureScale,
  count: number,
): TemperatureFieldLegendModel {
  return {
    ...fieldScaleFromStops(scale, null),
    kind: "temperature",
    count,
  };
}

export function buildTemperatureDeviationLegend(
  scale: TemperatureDeviationScale,
): TemperatureFieldLegendModel {
  return {
    ...fieldScaleFromStops(scale, scale.zeroPos),
    kind: "deviation",
  };
}
