// Which soil quantity and depth band the field map draws, deep-linked.
//
// `?quantity=` names a profile key (`soil_temperature`, `soil_moisture`) and
// `?band=` the band's ordinal depth rank as shown in the UI — not its position in
// the config array, so a shared link keeps meaning if the profile ever gains or
// drops a band. Both drop out of the URL at their defaults.

import type { DepthProfile } from "../types";
import { useEnumParam } from "./useUrlState";

export interface SoilFieldSelection {
  profile: DepthProfile;
  /** Position of the selected band in `profile.bands`, i.e. how values are read. */
  bandIndex: number;
  setProfileKey: (key: string) => void;
  setBand: (band: number) => void;
}

/**
 * Resolve the current selection against `profiles`, which must be non-empty (the
 * soil category declares them in `config/layers.ts`). An unknown or dropped band
 * falls back to the shallowest, so switching quantity can never leave the map
 * pointing at a band the new profile lacks.
 *
 * `defaultProfileKey` is the quantity the page opens on — the config order is a
 * data-model decision and need not match which quantity a view leads with. An
 * unknown key falls back to the first profile.
 */
export function useSoilFieldSelection(
  profiles: readonly [DepthProfile, ...DepthProfile[]],
  defaultProfileKey?: string,
): SoilFieldSelection {
  const profileKeys = profiles.map((profile) => profile.key);
  const [profileKey, setProfileKey] = useEnumParam(
    "quantity",
    profileKeys,
    profileKeys.find((key) => key === defaultProfileKey) ?? profileKeys[0],
  );
  const profile = profiles.find((p) => p.key === profileKey) ?? profiles[0];

  const bandValues = profile.bands.map((band) => String(band.band));
  const [bandValue, setBandValue] = useEnumParam("band", bandValues, bandValues[0]);
  const bandIndex = Math.max(
    0,
    profile.bands.findIndex((band) => String(band.band) === bandValue),
  );

  return {
    profile,
    bandIndex,
    setProfileKey,
    setBand: (band: number) => setBandValue(String(band)),
  };
}
