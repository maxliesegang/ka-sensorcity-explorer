import {
  AVERAGE_BASELINE_ID,
  DWD_BASELINE_ID,
  type BaselineOption,
  type SyntheticBaselineLabels,
  type TemperatureFieldMode,
  withSyntheticBaselineOptions,
} from "../config/temperatureBaselines";
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

interface LegendStop {
  pos: number;
  css: string;
}

export type TemperatureLegendModel =
  | {
      kind: "absolute";
      gradient: string;
      min: number;
      max: number;
      count: number;
    }
  | {
      kind: "deviation";
      gradient: string;
      min: number;
      max: number;
      zeroPos: number;
    };

export function buildTemperatureBaselineOptions(
  readings: readonly TemperatureBaselineReading[],
  labels: SyntheticBaselineLabels,
): BaselineOption[] {
  const byId = new Map<string, string>();
  for (const reading of readings) {
    if (!byId.has(reading.id)) byId.set(reading.id, reading.label);
  }

  const candidates = Array.from(byId, ([id, label]) => ({ id, label })).sort(
    (a, b) => a.label.localeCompare(b.label),
  );
  return withSyntheticBaselineOptions(candidates, labels);
}

export function resolveBaselineTemperature({
  mode,
  baselineId,
  readings,
  dwdTemperature,
}: {
  mode: TemperatureFieldMode;
  baselineId: string | null;
  readings: readonly TemperatureBaselineReading[];
  dwdTemperature?: number | null;
}): number | null {
  if (mode !== "deviation" || baselineId == null) return null;
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

export function buildAbsoluteTemperatureLegend(
  scale: TemperatureScale,
  count: number,
): TemperatureLegendModel {
  return {
    kind: "absolute",
    gradient: gradientFromStops(scale.stops(12)),
    min: scale.min,
    max: scale.max,
    count,
  };
}

export function buildDeviationTemperatureLegend(
  scale: TemperatureDeviationScale,
): TemperatureLegendModel {
  return {
    kind: "deviation",
    gradient: gradientFromStops(scale.stops(12)),
    min: scale.min,
    max: scale.max,
    zeroPos: scale.zeroPos,
  };
}

function gradientFromStops(stops: readonly LegendStop[]): string {
  const gradientStops = stops
    .map((stop) => `${stop.css} ${(stop.pos * 100).toFixed(2)}%`)
    .join(", ");
  return `linear-gradient(to right, ${gradientStops})`;
}
