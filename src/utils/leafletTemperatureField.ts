import L from "leaflet";

import { syncLabelScaleToZoom } from "./leafletLabelScale";
import type { TemperatureFieldPoint } from "./temperatureScale";
import { boundsFromTemperatureFieldPoints } from "./temperatureFieldBounds";
import { voronoiCells } from "./voronoi";

interface DrawTemperatureFieldOptions<T extends TemperatureFieldPoint> {
  map: L.Map;
  field: L.LayerGroup;
  markers: L.LayerGroup;
  points: T[];
  color: (point: T) => string;
  bindLayer?: (layer: L.Layer, point: T) => void;
  /**
   * When provided, a small permanent label with this text is drawn at the centre
   * of each cell (e.g. the temperature or the Δ from the baseline), so the value
   * can be read off the map without consulting the legend.
   */
  label?: (point: T) => string;
  fitBounds?: boolean;
  /**
   * When it returns true for a point, that marker is drawn with a thicker,
   * contrasting ring and larger radius to flag the baseline station.
   */
  highlight?: (point: T) => boolean;
}

// Distinct ring style applied to the baseline-station marker.
const HIGHLIGHT_STYLE = {
  radius: 7,
  weight: 3,
  color: "#131525",
};

export function clearTemperatureFieldLayers(
  field: L.LayerGroup,
  markers: L.LayerGroup,
): void {
  field.clearLayers();
  markers.clearLayers();
}

export function drawTemperatureField<T extends TemperatureFieldPoint>({
  map,
  field,
  markers,
  points,
  color,
  bindLayer,
  label,
  fitBounds = true,
  highlight,
}: DrawTemperatureFieldOptions<T>): void {
  clearTemperatureFieldLayers(field, markers);
  if (points.length === 0) return;

  // Labels shrink with zoom (via a CSS variable on the container), so keep that
  // in sync while labels are shown.
  if (label) syncLabelScaleToZoom(map);

  for (const cell of voronoiCells(points)) {
    const poly = L.polygon(cell.polygon, {
      color: "#ffffff",
      weight: 1,
      opacity: 0.5,
      fillColor: color(cell.point),
      fillOpacity: 0.6,
    }).addTo(field);
    bindLayer?.(poly, cell.point);

    if (label) addCellLabel(markers, cell.polygon, label(cell.point));
  }

  for (const point of points) {
    const isBaselinePoint = highlight?.(point) ?? false;
    const marker = L.circleMarker([point.lat, point.lon], {
      radius: isBaselinePoint ? HIGHLIGHT_STYLE.radius : 5,
      color: isBaselinePoint ? HIGHLIGHT_STYLE.color : "#fff",
      weight: isBaselinePoint ? HIGHLIGHT_STYLE.weight : 1,
      fillColor: color(point),
      fillOpacity: 1,
      className: isBaselinePoint ? "sensor-marker temperature-baseline-marker" : "sensor-marker",
    }).addTo(markers);
    bindLayer?.(marker, point);
  }

  if (fitBounds) fitTemperatureFieldToPoints(map, points);
}

/**
 * Draw a permanent value label at a cell's centroid (rather than binding it to
 * the marker, which would clobber the marker's hover tooltip), so the reading is
 * legible in place without consulting the legend. A fixed dark glyph with a
 * white halo (see `.temperature-field-label` in CSS) stays readable over any cell
 * colour — including the near-white centre of the diverging deviation scale.
 */
function addCellLabel(
  markers: L.LayerGroup,
  ring: Array<[number, number]>,
  text: string,
): void {
  L.tooltip({
    permanent: true,
    direction: "center",
    className: "temperature-field-label",
    interactive: false,
    opacity: 1,
  })
    .setLatLng(ringCentroid(ring))
    .setContent(text)
    .addTo(markers);
}

/** Mean of a [lat, lon] ring's vertices — good enough to centre a cell label. */
function ringCentroid(ring: Array<[number, number]>): [number, number] {
  let lat = 0;
  let lon = 0;
  for (const [y, x] of ring) {
    lat += y;
    lon += x;
  }
  return [lat / ring.length, lon / ring.length];
}

export function fitTemperatureFieldToPoints(
  map: L.Map,
  points: TemperatureFieldPoint[],
): void {
  if (points.length === 0) return;
  const bounds = boundsFromTemperatureFieldPoints(points);
  map.fitBounds(
    [
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    ],
    { padding: [24, 24], maxZoom: 14 },
  );
}
