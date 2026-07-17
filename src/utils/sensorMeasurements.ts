import { getCategory, measurementLabelKey } from "../config/layers";
import type { Category, DepthProfile, Measurement, Sensor } from "../types";
import { formatValue } from "./format";
import { toFiniteNumber } from "./number";

type Translate = (key: string) => string;

/**
 * The depth-banded families a category declares, empty unless its probes sample
 * at stacked depths. The one place the optional config field is defaulted, so
 * callers never repeat the `?? []`.
 */
export function getDepthProfiles(category: Category | undefined): DepthProfile[] {
  return category?.depthProfiles ?? [];
}

/**
 * A category's measurements that no depth profile covers.
 *
 * A banded family is a matrix (one quantity × N depths), not N unrelated
 * readings, and listing its fields flat buries that: the soil probe's 12
 * measurements are really 6 depths × 2 quantities. Callers render
 * {@link getDepthProfiles} as a depth table and these individually — together
 * the two cover every measurement exactly once. A category with no profiles has
 * every measurement unbanded, i.e. renders unchanged.
 */
export function getUnbandedMeasurements(category: Category | undefined): Measurement[] {
  const banded = new Set(
    getDepthProfiles(category).flatMap((profile) =>
      profile.bands.map((band) => band.field),
    ),
  );
  return (category?.measurements ?? []).filter((m) => !banded.has(m.field));
}

/**
 * The band numbers any of `profiles` reports, shallow→deep, de-duplicated —
 * i.e. the rows of a depth axis spanning several quantities at once.
 */
export function getBandNumbers(profiles: readonly DepthProfile[]): number[] {
  return [
    ...new Set(profiles.flatMap((profile) => profile.bands.map((b) => b.band))),
  ].sort((a, b) => a - b);
}

/**
 * One sensor's current reading for `field`, or null where the sensor carries no
 * usable value there. Layers declare fields they never populate, so an absent
 * or non-numeric attribute is routine rather than exceptional.
 */
export function getReading(sensor: Sensor, field: string): number | null {
  return toFiniteNumber(sensor.attributes[field]);
}

/** The measurement a category leads with — its first, by convention. */
export function getPrimaryMeasurement(sensor: Sensor): Measurement | undefined {
  return getCategory(sensor.category)?.measurements[0];
}

export function getPrimaryReading(sensor: Sensor): number | null {
  const primary = getPrimaryMeasurement(sensor);
  return primary ? getReading(sensor, primary.field) : null;
}

export function formatPrimaryReading(sensor: Sensor): string {
  const primary = getPrimaryMeasurement(sensor);
  return primary ? formatValue(sensor.attributes[primary.field], primary.unit) : "—";
}

/** The primary reading prefixed with its measurement's label, for map popups. */
export function formatPrimaryReadingLine(
  sensor: Sensor,
  translate: Translate,
): string {
  const primary = getPrimaryMeasurement(sensor);
  if (!primary) return formatPrimaryReading(sensor);
  return `${translate(measurementLabelKey(primary.field))}: ${formatPrimaryReading(sensor)}`;
}
