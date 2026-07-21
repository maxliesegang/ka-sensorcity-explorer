// Shared MapLibre GL map lifecycle for the map-based views.
//
// Mirrors the old raw-Leaflet pattern (create-once, view-specific effects
// populate it, teardown on unmount) but adapted to MapLibre's one hard rule:
// sources and layers can only be added *after* the style has loaded. So instead
// of exposing pre-made layer groups, this hook exposes an `isStyleReady` flag and
// leaves each view to add/update its own GeoJSON sources (see
// utils/maplibreGeoJson.ts) once `isStyleReady` is true.
//
// `isStyleReady` also does double duty for theme changes: `setStyle` throws away
// every custom source and layer, so on a light/dark switch we flip it false→true
// again, which re-runs each view's populate effect and re-adds its layers. One
// mechanism, both cases — consumers just depend on `isStyleReady`.

import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_MAP_ZOOM,
  getBasemapStyleUrl,
  KARLSRUHE_CENTER,
} from "../config/basemap";
import { useResolvedColorScheme } from "./useResolvedColorScheme";

export interface MapLibreMapHandle {
  /** Attach to the map container element. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** The MapLibre map, or null before it mounts / after teardown. */
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  /**
   * True once the current style has finished loading and it is safe to add
   * sources and layers. Flips back to false and true again across a theme swap,
   * so populate effects should depend on it and be safe to re-run.
   */
  isStyleReady: boolean;
}

/**
 * Create a MapLibre map (centred on Karlsruhe, OpenFreeMap vector tiles) once the
 * container mounts, tracking the active colour scheme for its basemap style.
 */
export function useMapLibreMap(): MapLibreMapHandle {
  const colorScheme = useResolvedColorScheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isStyleReady, setIsStyleReady] = useState(false);

  // Read the current scheme in the swap effect without making map creation depend
  // on it (the map is created once; the style is swapped separately below).
  const colorSchemeRef = useRef(colorScheme);
  colorSchemeRef.current = colorScheme;

  // Create once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getBasemapStyleUrl(colorSchemeRef.current),
      center: KARLSRUHE_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      attributionControl: { compact: true },
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
      "top-right",
    );

    mapRef.current = map;
    const onLoad = () => setIsStyleReady(true);
    map.on("load", onLoad);

    return () => {
      map.remove();
      mapRef.current = null;
      setIsStyleReady(false);
    };
  }, []);

  // Swap the basemap style when the colour scheme changes. `setStyle` clears every
  // custom source/layer, so cycle `isStyleReady` to re-trigger populate effects.
  const isInitialScheme = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (isInitialScheme.current) {
      // The create effect already applied the initial style.
      isInitialScheme.current = false;
      return;
    }

    setIsStyleReady(false);
    map.setStyle(getBasemapStyleUrl(colorScheme));
    // `idle` fires once the new style and its tiles have settled — a safe point to
    // re-add custom layers.
    map.once("idle", () => setIsStyleReady(true));
  }, [colorScheme]);

  return { containerRef, mapRef, isStyleReady };
}
