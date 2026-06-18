// Opt-in per-cell value labels for the temperature maps (live + historical).
//
// One place owns the feature: the persisted on/off preference (shared by both
// maps, off by default) plus the text each cell shows in either colour mode.
// Keeping the formatters here keeps the two maps consistent.

import { formatSignedDelta } from "../utils/format";
import { usePersistedToggle } from "./usePersistedToggle";

const STORAGE_KEY = "temperatureField.showLabels";
const UNIT = "°C";

/** Persisted on/off state for the maps' value labels (default off). */
export function useTemperatureFieldLabelVisibility(): [boolean, (value: boolean) => void] {
  return usePersistedToggle(STORAGE_KEY, false);
}

/** Absolute-mode label, e.g. "21.4 °C". */
export function formatTemperatureLabel(temperature: number): string {
  return `${temperature.toFixed(1)} ${UNIT}`;
}

/** Deviation-mode label (Δ from the baseline), e.g. "+1.3 °C". */
export function formatTemperatureDeviationLabel(delta: number): string {
  return formatSignedDelta(delta, UNIT);
}
