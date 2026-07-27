// On/off state for a persisted boolean the map fields expose as a toggle,
// driven by a URL param that overrides the stored preference when present.
//
// Unlike the value labels, field cells are *not* one preference across every map:
// the temperature field is a field first (cells on), while the soil field has
// always been read as probes at points (cells off), so each passes its own storage
// key, URL key and default, keeping them independent.

import { toBool, toBoolParam } from "../utils/urlParams";
import { usePersistedToggle } from "./usePersistedToggle";
import { useUrlState } from "./useUrlState";

/**
 * On/off state for a field toggle backed by localStorage and a URL param.
 * The URL (`?<urlKey>=`) wins when present so a shared link reproduces the
 * sender's choice; otherwise the stored preference under `storageKey` applies.
 * Toggling updates both, and the URL carries only the non-default value
 * so the default's link stays clean.
 */
export function useFieldToggle(
  storageKey: string,
  defaultValue: boolean,
  urlKey: string,
): [boolean, (value: boolean) => void] {
  const [params, updateParams] = useUrlState();
  const [stored, setStored] = usePersistedToggle(storageKey, defaultValue);

  const show = params.has(urlKey)
    ? toBool(params.get(urlKey), stored)
    : stored;

  function setShow(value: boolean) {
    setStored(value);
    updateParams({ [urlKey]: value === defaultValue ? null : toBoolParam(value) });
  }

  return [show, setShow];
}
