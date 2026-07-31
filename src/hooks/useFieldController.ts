// Owns the MapLibre field controller lifecycle for a view, so the field views
// (live temperature, combined community, historical replay, soil) don't each
// hand-roll the same create / fit / teardown effects.
//
// What stays with the view is the render effect: the point type, popup content
// and colour model differ per view, so each renders through the
// returned controller ref. What's identical — build the controller once the
// style is ready (and again after a theme swap), set the initial view once the
// data arrives, and remove everything on unmount — lives here.

import { useCallback, useEffect, useMemo, useRef } from "react";

import { boundsFromFieldPoints } from "../utils/fieldBounds";
import type { FieldPoint } from "../utils/fieldPoint";
import {
  createFieldController,
  type FieldController,
  type FieldControllerOptions,
} from "../utils/maplibreField";
import { useInitialMapView } from "./useInitialMapView";
import type { MapLibreMapHandle } from "./useMapLibreMap";

/** A field map has one view to establish, at mount; it has no second context. */
const FIELD_MAP_CONTEXT = "field-map";

export interface FieldControllerHandle {
  /** The live controller, or null before the style is ready. */
  controllerRef: React.MutableRefObject<FieldController | null>;
  /** Show the whole extent again — the viewer's way back after panning away. */
  resetView: () => void;
}

/**
 * Create and tear down a field controller across a map's life, showing
 * `extentPoints` once they arrive.
 *
 * **Sets the initial view exactly once per mount** (see `useInitialMapView`),
 * when there is first data to show. Everything after that is the viewer's:
 * redraws (band, display mode, labels, replay frames, refreshed readings) and
 * even a sensor appearing outside the current view leave the pan/zoom alone.
 * `resetView` is the deliberate way back, and every field view should offer it.
 *
 * `extentPoints` decides where the map looks, never what's drawn — pass the
 * widest set the view can show rather than the currently visible one, so a reset
 * doesn't depend on which band or replay frame happens to be up. The historical
 * replay passes every sensor across all frames; the soil field every probe, not
 * just the ones reporting the selected depth band.
 *
 * `options` may be rebuilt each render (its `onPopupAction` closes over React
 * setters); it's read through a ref, so creation depends only on `isStyleReady` and the
 * action always sees the current setters.
 */
export function useFieldController(
  { mapRef, isStyleReady }: MapLibreMapHandle,
  options: FieldControllerOptions,
  extentPoints: readonly FieldPoint[],
): FieldControllerHandle {
  const controllerRef = useRef<FieldController | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Build the field once the style is ready (and again after a theme swap, which
  // resets `isStyleReady` and discards the old style's custom layers).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleReady) return;
    const controller = createFieldController(map, {
      ...optionsRef.current,
      onPopupAction: (properties, popup) =>
        optionsRef.current.onPopupAction?.(properties, popup),
    });
    controllerRef.current = controller;
    return () => {
      controller.remove();
      controllerRef.current = null;
    };
  }, [isStyleReady, mapRef]);

  // Falls back to the city extent while empty, which is what `resetView` should
  // do before any data has loaded.
  const bounds = useMemo(() => boundsFromFieldPoints(extentPoints), [extentPoints]);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const resetView = useCallback(() => {
    controllerRef.current?.fitToBounds(boundsRef.current);
  }, []);

  // The one automatic move: the first render with both a controller and data to
  // show. (A theme swap rebuilds the controller but needs no new view —
  // `setStyle` keeps the viewport.)
  useInitialMapView(FIELD_MAP_CONTEXT, () => {
    if (!controllerRef.current || extentPoints.length === 0) return false;
    resetView();
    return true;
  });

  return { controllerRef, resetView };
}
