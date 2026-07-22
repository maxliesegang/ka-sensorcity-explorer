// Opt-in per-cell value labels for the temperature maps (live + historical).
//
// One place owns the feature: the persisted on/off preference (shared by both
// maps, off by default) plus the text each cell shows in either display mode.
// Keeping the formatters here keeps the two maps consistent.

import { formatSignedDelta } from "../utils/format";
import { toBool, toBoolParam } from "../utils/urlParams";
import { usePersistedToggle } from "./usePersistedToggle";
import { useUrlState } from "./useUrlState";

const STORAGE_KEY = "temperatureField.showLabels";
const UNIT = "°C";

/**
 * On/off state for the maps' value labels. The URL (`?labels=`) wins when
 * present so a shared link reproduces the sender's choice; otherwise the
 * localStorage preference (default off) applies as the viewer's personal
 * default. Toggling updates both — the personal default and the shareable URL.
 */
export function useTemperatureFieldLabelVisibility(): [boolean, (value: boolean) => void] {
  const [params, updateParams] = useUrlState();
  const [stored, setStored] = usePersistedToggle(STORAGE_KEY, false);

  const showLabels = params.has("labels")
    ? toBool(params.get("labels"), stored)
    : stored;

  function setShowLabels(value: boolean) {
    setStored(value);
    // Encode only "on": off is the hard default, so its link stays clean.
    updateParams({ labels: value ? toBoolParam(value) : null });
  }

  return [showLabels, setShowLabels];
}

/** Temperature-mode label, e.g. "21.4 °C". */
export function formatTemperatureLabel(temperature: number): string {
  return `${temperature.toFixed(1)} ${UNIT}`;
}

/** Deviation-mode label (Δ from the baseline), e.g. "+1.3 °C". */
export function formatTemperatureDeviationLabel(delta: number): string {
  return formatSignedDelta(delta, UNIT);
}
