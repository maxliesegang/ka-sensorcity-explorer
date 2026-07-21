import type * as maplibregl from "maplibre-gl";

// OpenFreeMap vector basemap configuration.
//
// Keyless, no-signup vector tiles (https://openfreemap.org) served from a public
// endpoint — chosen to preserve the app's no-backend / no-API-key design pillar.
// If the public instance is ever unreliable, the same styles can be self-hosted
// from a static planet file and only the URLs below change; call sites are unaffected.

/** Karlsruhe centre in MapLibre's [lon, lat] order. */
export const KARLSRUHE_CENTER: [number, number] = [8.4037, 49.0069];
export const DEFAULT_MAP_ZOOM = 12;

export type ColorScheme = "light" | "dark";

// OpenFreeMap ships `liberty`, `bright` and `positron`. `liberty` carries building
// footprints (the source for 3D extrusions) and reads well in light UI. We use it
// for both colour schemes. Swapping either — or pointing at a self-hosted style
// JSON — is a one-line change here.
const BASEMAP_STYLE_URLS: Record<ColorScheme, string> = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/liberty",
};

/** Basemap style URL for the active colour scheme. */
export function getBasemapStyleUrl(scheme: ColorScheme): string {
  return BASEMAP_STYLE_URLS[scheme];
}

const BUILDING_EXTRUSION_LAYER_ID = "3d-buildings";

/**
 * Add extruded 3D buildings for the location-context maps (sensor map, detail
 * map), giving a sense of where a sensor sits. They read as flat footprints when
 * the map is top-down and rise into 3D when the user tilts (drag with the compass
 * control). Robust across styles: it reuses whichever source the basemap's own
 * building layer draws from, and no-ops if the style has none. Assumes the style
 * is loaded; re-run after a theme swap (the layer is discarded with the style).
 */
export function addBuildingExtrusionLayer(map: maplibregl.Map): void {
  if (map.getLayer(BUILDING_EXTRUSION_LAYER_ID)) return;
  // Reuse whichever vector source the basemap's own building layer draws from,
  // rather than hardcoding a source name that varies between styles.
  let source: string | undefined;
  for (const layer of map.getStyle().layers ?? []) {
    if ("source-layer" in layer && layer["source-layer"] === "building" && "source" in layer) {
      source = layer.source;
      break;
    }
  }
  if (!source) return;

  map.addLayer({
    id: BUILDING_EXTRUSION_LAYER_ID,
    type: "fill-extrusion",
    source,
    "source-layer": "building",
    minzoom: 14,
    paint: {
      "fill-extrusion-color": "#d0d3db",
      // OpenMapTiles publishes render_height/render_min_height; fall back gracefully.
      "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 0],
      "fill-extrusion-base": [
        "coalesce",
        ["get", "render_min_height"],
        ["get", "min_height"],
        0,
      ],
      "fill-extrusion-opacity": 0.6,
    },
  });
}
