import { getCategory, measurementLabelKey } from "../config/layers";
import type { Measurement, Sensor } from "../types";
import { formatValue } from "./format";

type Translate = (key: string) => string;

export function getPrimaryMeasurement(sensor: Sensor): Measurement | undefined {
  return getCategory(sensor.category)?.measurements[0];
}

export function getPrimaryMeasurementValue(sensor: Sensor): number | null {
  const primary = getPrimaryMeasurement(sensor);
  if (!primary) return null;
  const value = sensor.attributes[primary.field];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function formatPrimaryMeasurementValue(sensor: Sensor): string {
  const primary = getPrimaryMeasurement(sensor);
  return primary ? formatValue(sensor.attributes[primary.field], primary.unit) : "—";
}

export function formatPrimaryMeasurementLine(
  sensor: Sensor,
  translate: Translate,
): string {
  const primary = getPrimaryMeasurement(sensor);
  if (!primary) return formatPrimaryMeasurementValue(sensor);
  return `${translate(measurementLabelKey(primary.field))}: ${formatPrimaryMeasurementValue(
    sensor,
  )}`;
}
