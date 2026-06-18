import type { RasterBounds, TemperatureFieldPoint } from "./temperatureScale";

// Fallback bounds roughly covering the Karlsruhe city area, used when there are
// no temperature points to derive an extent from.
export const KARLSRUHE_TEMPERATURE_BOUNDS: RasterBounds = {
  north: 49.07,
  south: 48.95,
  east: 8.49,
  west: 8.32,
};

/** Derive padded raster bounds from a point extent (with a Karlsruhe fallback). */
export function boundsFromTemperatureFieldPoints(points: TemperatureFieldPoint[]): RasterBounds {
  if (points.length === 0) return KARLSRUHE_TEMPERATURE_BOUNDS;

  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;
  for (const point of points) {
    if (point.lat > north) north = point.lat;
    if (point.lat < south) south = point.lat;
    if (point.lon > east) east = point.lon;
    if (point.lon < west) west = point.lon;
  }

  const latPad = Math.max((north - south) * 0.08, 0.01);
  const lonPad = Math.max((east - west) * 0.08, 0.01);
  return {
    north: north + latPad,
    south: south - latPad,
    east: east + lonPad,
    west: west - lonPad,
  };
}
