// Which display a sensor type gets for its current readings.
//
// Dispatch is on what a category *declares*, not on which type it happens to be:
// a category with depth-banded families gets the depth display, whoever it turns
// out to be. Keying on the category key instead would put the decision on a
// second axis that can silently disagree with the first — a category added to
// `config/layers.ts` with `depthProfiles` would grow the profile tab (which is
// gated on shape, in `SensorDetailView`) while its readings quietly rendered as
// flat cards, with nothing throwing.
//
// The day a type needs a display that its shape cannot express, this is where a
// key-driven registry belongs — sharing the one seam the detail view already
// calls, so the view still never branches on type.

import type { Category } from "../../types";
import { getDepthProfiles } from "../../utils/sensorMeasurements";
import { DepthReadings } from "./DepthReadings";
import { GenericReadings } from "./GenericReadings";
import type { ReadingsPanel } from "./types";

export function getReadingsPanel(category: Category | undefined): ReadingsPanel {
  return getDepthProfiles(category).length > 0 ? DepthReadings : GenericReadings;
}
