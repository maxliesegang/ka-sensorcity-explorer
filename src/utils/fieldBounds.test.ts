import { describe, expect, it } from "vitest";

import { boundsFromFieldPoints, KARLSRUHE_FIELD_BOUNDS } from "./fieldBounds";

const KARLSRUHE = { lat: 49.0, lon: 8.4 };
const DURLACH = { lat: 48.99, lon: 8.47 };

describe("boundsFromFieldPoints", () => {
  // What a field map's "reset view" falls back to before any data has loaded.
  it("falls back to the city extent with no points", () => {
    expect(boundsFromFieldPoints([])).toEqual(KARLSRUHE_FIELD_BOUNDS);
  });

  it("pads the point extent on every side", () => {
    const bounds = boundsFromFieldPoints([KARLSRUHE, DURLACH]);
    expect(bounds.north).toBeGreaterThan(KARLSRUHE.lat);
    expect(bounds.south).toBeLessThan(DURLACH.lat);
    expect(bounds.east).toBeGreaterThan(DURLACH.lon);
    expect(bounds.west).toBeLessThan(KARLSRUHE.lon);
  });

  it("keeps a single point framed rather than collapsing to a zero-size box", () => {
    const bounds = boundsFromFieldPoints([KARLSRUHE]);
    expect(bounds.north - bounds.south).toBeGreaterThan(0);
    expect(bounds.east - bounds.west).toBeGreaterThan(0);
  });
});
