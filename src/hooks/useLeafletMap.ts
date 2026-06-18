// Shared Leaflet map lifecycle for the map-based views.
//
// Both views use the raw Leaflet API (no react-leaflet): the map is created
// once against a container ref, populated by view-specific effects, and torn
// down on unmount. This hook owns that create-once/teardown boilerplate plus
// the shared base-map config, so each view is left with only its own data
// binding. Named layer groups are created in order (first = bottom-most) so a
// view can layer a field overlay under its markers.

import L from "leaflet";
import { useEffect, useRef } from "react";

export const KARLSRUHE: L.LatLngTuple = [49.0069, 8.4037];
export const DEFAULT_ZOOM = 12;

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";

export interface LeafletMap<Name extends string> {
  /** Attach to the map container element. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** The Leaflet map instance, or null before it mounts / after teardown. */
  mapRef: React.MutableRefObject<L.Map | null>;
  /**
   * The named layer groups, in the order requested. Empty until the map mounts,
   * so consumers should null-check individual groups in their effects.
   */
  groupsRef: React.MutableRefObject<Partial<Record<Name, L.LayerGroup>>>;
}

/**
 * Create a Leaflet map (centred on Karlsruhe, OSM tiles) once the container is
 * mounted, with one `L.LayerGroup` per name in `groupNames`. The map and its
 * groups live in refs so view effects can clear/repopulate them without
 * re-creating the map. `groupNames` is read once on mount.
 */
export function useLeafletMap<Name extends string>(
  groupNames: readonly Name[],
): LeafletMap<Name> {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const groupsRef = useRef<Partial<Record<Name, L.LayerGroup>>>({});
  // Read once: changing the set of groups after mount is not supported.
  const namesRef = useRef(groupNames);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(KARLSRUHE, DEFAULT_ZOOM);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);

    const groups: Partial<Record<Name, L.LayerGroup>> = {};
    for (const name of namesRef.current) {
      groups[name] = L.layerGroup().addTo(map);
    }
    groupsRef.current = groups;
    mapRef.current = map;
    const id = window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      window.clearTimeout(id);
      map.remove();
      mapRef.current = null;
      groupsRef.current = {};
    };
  }, []);

  return { containerRef, mapRef, groupsRef };
}
