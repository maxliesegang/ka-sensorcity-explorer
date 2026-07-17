// Guards the config → readings-display seam.
//
// Nothing type-checks that the live config still reaches the depth display: a
// category losing its `depthProfiles` upstream would fall back to flat cards
// silently, which is how this feed fails (see CLAUDE.md).

import { describe, expect, it } from "vitest";

import { TEMPERATURE_CATEGORY_KEY, getCategory } from "../../config/layers";
import { DepthReadings } from "./DepthReadings";
import { GenericReadings } from "./GenericReadings";
import { getReadingsPanel } from "./panel";

describe("getReadingsPanel", () => {
  it("gives a category that samples at stacked depths the depth display", () => {
    expect(getReadingsPanel(getCategory("Boden-Sensor"))).toBe(DepthReadings);
  });

  it("gives everything else the generic display", () => {
    expect(getReadingsPanel(getCategory(TEMPERATURE_CATEGORY_KEY))).toBe(GenericReadings);
    // A category the feed reports but the config doesn't know.
    expect(getReadingsPanel(undefined)).toBe(GenericReadings);
  });
});
