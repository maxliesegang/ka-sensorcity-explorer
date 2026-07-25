// Opt-in per-cell value labels, shared by every map field (temperature live and
// historical, soil). One preference rather than one per map: a viewer who wants
// numbers on cells wants them wherever cells are drawn.

import { toBool, toBoolParam } from "../utils/urlParams";
import { usePersistedToggle } from "./usePersistedToggle";
import { useUrlState } from "./useUrlState";

// Named for the temperature map that introduced the toggle. Kept verbatim: a
// tidier key would silently discard every existing viewer's preference.
const STORAGE_KEY = "temperatureField.showLabels";

/**
 * On/off state for a field's value labels. The URL (`?labels=`) wins when
 * present so a shared link reproduces the sender's choice; otherwise the
 * localStorage preference (default off) applies as the viewer's personal
 * default. Toggling updates both — the personal default and the shareable URL.
 */
export function useFieldLabelVisibility(): [boolean, (value: boolean) => void] {
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
