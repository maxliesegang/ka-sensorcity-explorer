// Curated "Nullpunkt" baseline stations for the deviation mode.
//
// In deviation mode a field shows each sensor's reading relative to a chosen
// baseline ("Nullpunkt") station. The baseline cannot be picked automatically:
// the coldest sensor on a given night is frequently a high-altitude /
// mountain-village station that reads cold purely because of elevation, not
// because it represents the "undisturbed" urban-edge baseline we want to compare
// against. So we curate a small list of stable, representative candidates the
// user can pick from. Codes are the leading numeric part of a sensor `name`
// (format "NNN - Street", e.g. "132 - Wasserwerkstrasse").

export interface BaselineOption {
  id: string;
  label: string;
}

/** Hand-picked candidate baseline-station codes (leading code of the name). */
export const BASELINE_STATION_CODES: readonly string[] = [
  "132",
  "004",
  "015",
  "018",
  "027",
  "031",
  "182",
  "072",
  "055",
  "137",
  "154",
  "135",
];

/**
 * Parse the leading numeric code from a sensor name ("132 - Wasserwerkstrasse"
 * -> "132"). Leading zeros are preserved (digits returned verbatim, e.g. "004").
 * Returns null when the name has no leading digit run.
 */
export function getBaselineStationCode(name: string): string | null {
  const match = name.match(/^\s*(\d+)/);
  return match ? match[1] : null;
}

/** True when the sensor's leading code is one of the curated candidates. */
export function isBaselineStationCandidate(sensor: { name: string }): boolean {
  const code = getBaselineStationCode(sensor.name);
  return code != null && BASELINE_STATION_CODES.includes(code);
}

/**
 * Sentinel id for the DWD Rheinstetten weather station as a selectable
 * baseline. Distinct from any sensor objectId-stringified, so the UI can use a
 * single string id space for "which baseline is selected".
 */
export const DWD_BASELINE_ID = "dwd:rheinstetten";

/**
 * Sentinel id for "the average of all sensors shown" as a selectable baseline.
 * Like {@link DWD_BASELINE_ID}, it lives in the same string id space as the
 * stringified sensor objectIds but cannot collide with one.
 */
export const AVERAGE_BASELINE_ID = "avg:sensors";

/** The non-sensor baselines a field can offer. */
export type SyntheticBaselineId = typeof DWD_BASELINE_ID | typeof AVERAGE_BASELINE_ID;

/**
 * The order synthetic options appear in the picker, so a field chooses *which*
 * it offers and never *where* they sit.
 */
const SYNTHETIC_BASELINE_ORDER: readonly SyntheticBaselineId[] = [
  DWD_BASELINE_ID,
  AVERAGE_BASELINE_ID,
];

/**
 * Display labels for the synthetic (non-sensor) baseline options. Partial
 * because not every field offers every one: DWD Rheinstetten measures *air*
 * temperature, which is no reference at all for a soil probe, so the soil field
 * offers the city average alone.
 */
export type SyntheticBaselineLabels = Partial<Record<SyntheticBaselineId, string>>;

/**
 * Prepend the synthetic baseline options a field offers to its per-sensor
 * candidates. An option is offered when `labels` names it, so adding a
 * non-sensor baseline here reaches every field that has a label for it.
 */
function withSyntheticBaselineOptions(
  candidates: BaselineOption[],
  labels: SyntheticBaselineLabels,
): BaselineOption[] {
  const synthetic = SYNTHETIC_BASELINE_ORDER.flatMap((id) => {
    const label = labels[id];
    return label ? [{ id, label }] : [];
  });
  return [...synthetic, ...candidates];
}

/**
 * The picker's options: the sensors that can serve as a baseline (de-duplicated
 * by id, ordered by label) behind the synthetic options the field offers.
 */
export function buildBaselineOptions(
  candidates: readonly BaselineOption[],
  labels: SyntheticBaselineLabels,
): BaselineOption[] {
  const byId = new Map<string, string>();
  for (const candidate of candidates) {
    if (!byId.has(candidate.id)) byId.set(candidate.id, candidate.label);
  }

  const sensors = Array.from(byId, ([id, label]) => ({ id, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  return withSyntheticBaselineOptions(sensors, labels);
}

export function getDefaultBaselineId(
  options: readonly BaselineOption[],
): string | null {
  return (
    options.find((option) => option.id === DWD_BASELINE_ID)?.id ??
    options[0]?.id ??
    null
  );
}

export function hasBaselineOption(
  options: readonly BaselineOption[],
  id: string | null,
): boolean {
  return id != null && options.some((option) => option.id === id);
}

export function getBaselineLabel(
  options: readonly BaselineOption[],
  id: string | null,
): string {
  return options.find((option) => option.id === id)?.label ?? "";
}
