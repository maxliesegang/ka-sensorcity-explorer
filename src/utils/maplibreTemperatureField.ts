// The temperature field for the map-based temperature views, as three MapLibre
// layers over the basemap:
//   • cells   — Voronoi/Thiessen polygons filled with each sensor's colour (the field)
//   • markers — a circle per sensor at its exact location
//   • labels  — an optional per-cell value label (symbol layer, native collision + zoom sizing)
//
// A controller owns the sources/layers and their interactions for the life of a
// map/style: `create` builds them empty and wires hover + popups once, then
// `render` just swaps the GeoJSON on data/mode/label changes. Because MapLibre's
// `setStyle` (theme swap) discards custom layers, the owning view recreates the
// controller whenever the map reports `isStyleReady` again.

import type { Feature } from "geojson";
import type * as maplibregl from "maplibre-gl";

import {
  addLayerIfMissing,
  createPointFeature,
  createPolygonFeature,
  getFirstSymbolLayerId,
  removeLayerIfPresent,
  removeSourceIfPresent,
  upsertGeoJsonSource,
  type FeatureId,
} from "./maplibreGeoJson";
import {
  bindCircleHoverState,
  bindFeaturePopups,
  createInteractiveCirclePaint,
  type InteractiveCircleStyle,
  type InteractiveFeatureProperties,
} from "./maplibreMarkers";
import { boundsFromTemperatureFieldPoints } from "./temperatureFieldBounds";
import type { TemperatureFieldPoint } from "./temperatureScale";
import { voronoiCells } from "./voronoi";

const CELL_SOURCE_ID = "temperature-cells";
const CELL_LAYER_ID = "temperature-cells-fill";
const MARKER_SOURCE_ID = "temperature-markers";
const MARKER_LAYER_ID = "temperature-markers-circle";
const LABEL_SOURCE_ID = "temperature-labels";
const LABEL_LAYER_ID = "temperature-labels-symbol";

// Ring sizes for the point markers — smaller than the sensor map's, as they sit
// atop the coloured field. Solid fill so they read as dots over the cells.
const MARKER_STYLE: InteractiveCircleStyle = {
  default: { radius: 5, strokeWidth: 1 },
  hovered: { radius: 8, strokeWidth: 2 },
  active: { radius: 9, strokeWidth: 3 },
  highlighted: { radius: 7, strokeWidth: 3 },
  opacity: 1,
};

const EMPTY_FEATURES: Feature[] = [];

/** Per-point accessors describing how to render one temperature field. */
export interface TemperatureFieldRenderOptions<T extends TemperatureFieldPoint> {
  points: T[];
  /** Stable feature id shared by a point's cell and marker (the sensor's objectId). */
  getId: (point: T) => FeatureId;
  getColor: (point: T) => string;
  /** Pre-built popup HTML (see `buildSensorPopupHtml`). */
  getPopupHtml: (point: T) => string;
  /** Plain hover-tooltip text. */
  getTooltipText: (point: T) => string;
  /** Per-cell value label; omit to hide labels. */
  getLabel?: (point: T) => string;
  /** Flags a point's marker with a contrasting ring (e.g. the baseline station). */
  isHighlighted?: (point: T) => boolean;
  /** Extra flat properties merged into each feature (e.g. an id the action needs). */
  getProperties?: (point: T) => Record<string, string | number | boolean>;
}

export interface TemperatureFieldController {
  /** Rebuild the field from a new set of points/accessors. */
  render: <T extends TemperatureFieldPoint>(options: TemperatureFieldRenderOptions<T>) => void;
  /** Empty every layer without removing them. */
  clear: () => void;
  /** Fit the map to a set of points (with the shared Karlsruhe fallback padding). */
  fitToPoints: (points: TemperatureFieldPoint[]) => void;
  /** Remove all layers, sources and interaction listeners. */
  remove: () => void;
}

export interface TemperatureFieldControllerOptions {
  popupClassName?: string;
  tooltipClassName?: string;
  /** Wire the popup's action button (e.g. "set as reference"). */
  onPopupAction?: (properties: InteractiveFeatureProperties, popup: maplibregl.Popup) => void;
}

/**
 * Build the (initially empty) field layers on a ready map and wire their
 * interactions once. Call `render` to populate/update. Assumes the style is loaded.
 */
export function createTemperatureFieldController(
  map: maplibregl.Map,
  {
    popupClassName,
    tooltipClassName,
    onPopupAction,
  }: TemperatureFieldControllerOptions = {},
): TemperatureFieldController {
  upsertGeoJsonSource(map, CELL_SOURCE_ID, EMPTY_FEATURES);
  upsertGeoJsonSource(map, MARKER_SOURCE_ID, EMPTY_FEATURES);
  upsertGeoJsonSource(map, LABEL_SOURCE_ID, EMPTY_FEATURES);

  // Cells sit beneath the basemap's place labels so streets/POIs stay readable;
  // markers and value labels sit on top so they're legible and clickable.
  addLayerIfMissing(
    map,
    {
      id: CELL_LAYER_ID,
      type: "fill",
      source: CELL_SOURCE_ID,
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": 0.6,
        "fill-outline-color": "rgba(255, 255, 255, 0.5)",
      },
    },
    getFirstSymbolLayerId(map),
  );
  addLayerIfMissing(map, {
    id: MARKER_LAYER_ID,
    type: "circle",
    source: MARKER_SOURCE_ID,
    paint: createInteractiveCirclePaint(MARKER_STYLE),
  });
  addLayerIfMissing(map, {
    id: LABEL_LAYER_ID,
    type: "symbol",
    source: LABEL_SOURCE_ID,
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 13],
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#131525",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.6,
    },
  });

  const unbindHoverState = bindCircleHoverState(map, {
    sourceId: MARKER_SOURCE_ID,
    layerId: MARKER_LAYER_ID,
  });
  const unbindPopups = bindFeaturePopups(map, {
    layerIds: [CELL_LAYER_ID, MARKER_LAYER_ID],
    activeSourceId: MARKER_SOURCE_ID,
    popupClassName,
    tooltipClassName,
    onPopupAction,
  });

  function render<T extends TemperatureFieldPoint>(
    options: TemperatureFieldRenderOptions<T>,
  ): void {
    const cells: Feature[] = [];
    const labels: Feature[] = [];

    for (const cell of voronoiCells(options.points)) {
      const point = cell.point;
      cells.push(
        createPolygonFeature(
          cell.polygon,
          options.getId(point),
          buildFeatureProperties(options, point),
        ),
      );
      if (options.getLabel) {
        const [lon, lat] = ringCentroid(cell.polygon);
        labels.push(
          createPointFeature(lon, lat, options.getId(point), {
            label: options.getLabel(point),
          }),
        );
      }
    }

    const markers = options.points.map((point) =>
      createPointFeature(
        point.lon,
        point.lat,
        options.getId(point),
        buildFeatureProperties(options, point),
      ),
    );

    upsertGeoJsonSource(map, CELL_SOURCE_ID, cells);
    upsertGeoJsonSource(map, MARKER_SOURCE_ID, markers);
    upsertGeoJsonSource(map, LABEL_SOURCE_ID, labels);
  }

  function clear(): void {
    upsertGeoJsonSource(map, CELL_SOURCE_ID, EMPTY_FEATURES);
    upsertGeoJsonSource(map, MARKER_SOURCE_ID, EMPTY_FEATURES);
    upsertGeoJsonSource(map, LABEL_SOURCE_ID, EMPTY_FEATURES);
  }

  function fitToPoints(points: TemperatureFieldPoint[]): void {
    const bounds = boundsFromTemperatureFieldPoints(points);
    map.fitBounds(
      [
        [bounds.west, bounds.south],
        [bounds.east, bounds.north],
      ],
      { padding: 24, maxZoom: 14 },
    );
  }

  function remove(): void {
    unbindHoverState();
    unbindPopups();
    for (const id of [CELL_LAYER_ID, MARKER_LAYER_ID, LABEL_LAYER_ID]) {
      removeLayerIfPresent(map, id);
    }
    for (const id of [CELL_SOURCE_ID, MARKER_SOURCE_ID, LABEL_SOURCE_ID]) {
      removeSourceIfPresent(map, id);
    }
  }

  return { render, clear, fitToPoints, remove };
}

/** Build the shared feature properties (colour, popup, tooltip, highlight, extras). */
function buildFeatureProperties<T extends TemperatureFieldPoint>(
  options: TemperatureFieldRenderOptions<T>,
  point: T,
): InteractiveFeatureProperties {
  return {
    color: options.getColor(point),
    popup: options.getPopupHtml(point),
    tooltip: options.getTooltipText(point),
    isHighlighted: options.isHighlighted?.(point) ?? false,
    ...options.getProperties?.(point),
  };
}

/** Mean of a [lon, lat] ring's vertices — good enough to centre a cell label. */
function ringCentroid(ring: Array<[number, number]>): [number, number] {
  let lon = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lon += x;
    lat += y;
  }
  return [lon / ring.length, lat / ring.length];
}
