// Small idempotent helpers for driving MapLibre from React effects.
//
// A view's populate effect can run many times — on every data change, and again
// after a theme swap wipes the style — so the primitives here are all "add if
// absent, otherwise update": call them freely without churning the map. Geometry
// is GeoJSON-native [lon, lat] throughout (see utils/voronoi.ts).

import type { Feature, FeatureCollection, GeoJsonProperties } from "geojson";
import type * as maplibregl from "maplibre-gl";

/** Feature `id` must live at the top level (not in properties) for feature-state to target it. */
export type FeatureId = number | string;
export type LngLatTuple = [longitude: number, latitude: number];
export type LngLatBounds = [southwest: LngLatTuple, northeast: LngLatTuple];

/** Extend an immutable southwest/northeast bounds tuple with one coordinate. */
export function extendLngLatBounds(
  bounds: LngLatBounds | null,
  coordinate: LngLatTuple,
): LngLatBounds {
  if (!bounds) return [[...coordinate], [...coordinate]];
  const [[west, south], [east, north]] = bounds;
  return [
    [Math.min(west, coordinate[0]), Math.min(south, coordinate[1])],
    [Math.max(east, coordinate[0]), Math.max(north, coordinate[1])],
  ];
}

/** A Point feature in [lon, lat] order with a stable id for feature-state. */
export function createPointFeature(
  longitude: number,
  latitude: number,
  id: FeatureId,
  properties: GeoJsonProperties,
): Feature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties,
  };
}

/** A Polygon feature from a single [lon, lat] ring (auto-closed). */
export function createPolygonFeature(
  ring: LngLatTuple[],
  id: FeatureId,
  properties: GeoJsonProperties,
): Feature {
  const closed = ring.length > 0 ? [...ring, ring[0]] : ring;
  return { type: "Feature", id, geometry: { type: "Polygon", coordinates: [closed] }, properties };
}

/**
 * Add a GeoJSON source, or replace its data if it already exists. Returning to a
 * source that's already on the map just calls `setData`, which is the cheap path
 * MapLibre optimises for.
 */
export function upsertGeoJsonSource(
  map: maplibregl.Map,
  id: string,
  features: Feature[],
): void {
  const data: FeatureCollection = { type: "FeatureCollection", features };
  const existing = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
  } else {
    map.addSource(id, { type: "geojson", data });
  }
}

/**
 * Add a layer only if it isn't already present. `beforeId` inserts it beneath an
 * existing style layer (e.g. the basemap's building layer, so 3D buildings render
 * on top of the temperature field). A missing `beforeId` is ignored by MapLibre.
 */
export function addLayerIfMissing(
  map: maplibregl.Map,
  layer: maplibregl.LayerSpecification,
  beforeId?: string,
): void {
  if (map.getLayer(layer.id)) return;
  map.addLayer(layer, beforeId && map.getLayer(beforeId) ? beforeId : undefined);
}

/**
 * The id of the basemap's first symbol (label) layer, or undefined if none.
 * Inserting a fill layer before it keeps the basemap's place labels legible on
 * top of the overlay.
 */
export function getFirstSymbolLayerId(map: maplibregl.Map): string | undefined {
  return map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
}

/**
 * False once `map.remove()` has torn the map down: its style is gone, so
 * `getLayer`/`getSource`/`setFeatureState` would throw. Teardown paths can run
 * after the map itself was removed (React cleans the map hook's effect up before
 * a view's own effects on unmount), so guard those paths with this. `_removed` is
 * MapLibre's own teardown flag — no public equivalent exists.
 */
export function isMapActive(map: maplibregl.Map): boolean {
  return !(map as unknown as { _removed?: boolean })._removed;
}

/** Remove a layer or source when present; safe after the map has been removed. */
export function removeLayerIfPresent(map: maplibregl.Map, id: string): void {
  if (isMapActive(map) && map.getLayer(id)) map.removeLayer(id);
}

export function removeSourceIfPresent(map: maplibregl.Map, id: string): void {
  if (isMapActive(map) && map.getSource(id)) map.removeSource(id);
}
