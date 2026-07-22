// Owns the MapLibre temperature-field controller lifecycle for a view, so the
// three temperature views (live SensorCity, combined community, historical
// replay) don't each hand-roll the same create / fit / teardown effects.
//
// What stays with the view is the render effect: the point type, popup content
// and colour model differ per view, so each renders through the
// returned controller ref. What's identical — build the controller once the
// style is ready (and again after a theme swap), fit the map to
// the data when it changes, and remove everything on unmount — lives here.

import { useEffect, useRef } from "react";

import {
  createTemperatureFieldController,
  type TemperatureFieldController,
  type TemperatureFieldControllerOptions,
} from "../utils/maplibreTemperatureField";
import type { TemperatureFieldPoint } from "../utils/temperatureScale";
import type { MapLibreMapHandle } from "./useMapLibreMap";

/**
 * Create and tear down a temperature-field controller across a map's life, fitting
 * it to `points` whenever that data changes. Returns a ref to the live
 * controller (or null before it's ready) for the caller's own render effect.
 *
 * `options` may be rebuilt each render (its `onPopupAction` closes over React
 * setters); it's read through a ref, so creation depends only on `isStyleReady` and the
 * action always sees the current setters.
 */
export function useTemperatureFieldController(
  { mapRef, isStyleReady }: MapLibreMapHandle,
  options: TemperatureFieldControllerOptions,
  points: TemperatureFieldPoint[],
): React.MutableRefObject<TemperatureFieldController | null> {
  const controllerRef = useRef<TemperatureFieldController | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Build the field once the style is ready (and again after a theme swap, which
  // resets `isStyleReady` and discards the old style's custom layers).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleReady) return;
    const controller = createTemperatureFieldController(map, optionsRef.current);
    controllerRef.current = controller;
    return () => {
      controller.remove();
      controllerRef.current = null;
    };
  }, [isStyleReady, mapRef]);

  // Fit the view to the data only when the data itself changes — not on every
  // redraw (toggling labels, switching display mode), so those leave the current
  // pan/zoom untouched.
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || points.length === 0) return;
    controller.fitToPoints(points);
  }, [isStyleReady, points]);

  return controllerRef;
}
