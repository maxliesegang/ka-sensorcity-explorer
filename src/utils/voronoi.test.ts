import { describe, expect, it } from "vitest";

import { voronoiCells } from "./voronoi";

// Four points around Karlsruhe, clearly separated so each owns a distinct cell.
const POINTS = [
  { lat: 49.00, lon: 8.40, id: "sw" },
  { lat: 49.02, lon: 8.40, id: "nw" },
  { lat: 49.00, lon: 8.42, id: "se" },
  { lat: 49.02, lon: 8.42, id: "ne" },
];

describe("voronoiCells", () => {
  it("returns nothing for fewer than three points", () => {
    expect(voronoiCells(POINTS.slice(0, 2))).toEqual([]);
  });

  it("emits ring vertices in GeoJSON [lon, lat] order", () => {
    const cells = voronoiCells(POINTS);
    expect(cells.length).toBeGreaterThan(0);

    for (const cell of cells) {
      for (const [lon, lat] of cell.polygon) {
        // Karlsruhe: lon ≈ 8.4, lat ≈ 49 — the two are unambiguous, so a flipped
        // pair would land the values in the wrong slots.
        expect(lon).toBeGreaterThan(8);
        expect(lon).toBeLessThan(9);
        expect(lat).toBeGreaterThan(48);
        expect(lat).toBeLessThan(50);
      }
    }
  });

  it("keeps each cell's originating point near its own polygon", () => {
    for (const cell of voronoiCells(POINTS)) {
      const lons = cell.polygon.map(([lon]) => lon);
      const lats = cell.polygon.map(([, lat]) => lat);
      // The generating point sits inside (or on) its cell's bounding box.
      expect(cell.point.lon).toBeGreaterThanOrEqual(Math.min(...lons) - 1e-6);
      expect(cell.point.lon).toBeLessThanOrEqual(Math.max(...lons) + 1e-6);
      expect(cell.point.lat).toBeGreaterThanOrEqual(Math.min(...lats) - 1e-6);
      expect(cell.point.lat).toBeLessThanOrEqual(Math.max(...lats) + 1e-6);
    }
  });
});
