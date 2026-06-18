import L from "leaflet";

// Zoom-responsive sizing for the temperature maps' permanent cell labels.
//
// The scale factor is published as the `--temp-label-scale` CSS custom property
// on the map container; the label font-size multiplies by it (see
// `.temperature-field-label` in styles.css). Keeping the maths and the variable name
// together here is the single source of truth for how labels shrink with zoom.

/** CSS custom property the label font-size reads its scale from. */
export const LABEL_SCALE_VAR = "--temp-label-scale";

// Labels render full-size at the city-overview zoom and above, then taper by a
// fixed amount per zoom level down to a floor so they never vanish entirely.
const FULL_ZOOM = 14; // at/above this zoom labels render at full size
const MIN_SCALE = 0.6; // floor so far-out labels stay legible
const SHRINK_PER_ZOOM = 0.12; // fraction of size lost per zoom level below full

/** Label scale factor for a given map zoom level (1 = full size). */
export function labelScaleForZoom(zoom: number): number {
  const levelsBelowFull = Math.max(0, FULL_ZOOM - zoom);
  return Math.max(MIN_SCALE, 1 - levelsBelowFull * SHRINK_PER_ZOOM);
}

// Marks a map whose label scale is already kept in sync, so repeated draws
// refresh the value without stacking duplicate `zoomend` listeners.
const BOUND = new WeakSet<L.Map>();

/**
 * Keep {@link LABEL_SCALE_VAR} on the map container in sync with the zoom level.
 * Safe to call on every redraw: the `zoomend` listener is bound once per map,
 * and each call also refreshes the current value (priming labels just drawn).
 */
export function syncLabelScaleToZoom(map: L.Map): void {
  const apply = () =>
    map
      .getContainer()
      .style.setProperty(LABEL_SCALE_VAR, labelScaleForZoom(map.getZoom()).toFixed(3));

  apply();
  if (!BOUND.has(map)) {
    map.on("zoomend", apply);
    BOUND.add(map);
  }
}
