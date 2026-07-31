// One rule for every map in the app: set the initial view once, then leave the
// viewport to the viewer.
//
// A map that re-centres itself mid-session moves for reasons the viewer can't
// predict — a sensor coming back online, a refreshed reading, a language switch —
// and undoes the pan or zoom they just performed. So the automatic view gets
// exactly one chance per context, and every later move is either their own
// gesture or a control they pressed (`MapResetViewButton`).
//
// *view* is this file's word for where the map is looking, matching `resetView`
// and the reset button; *fit* is one way to reach a view (`fitToBounds`), a jump
// to a centre and zoom is another. Deliberately not "frame", which the historical
// replay already uses for a time-slice of readings.

import { useEffect, useRef } from "react";

/** Distinct from any caller-supplied context, including `undefined` and `null`. */
const NO_CONTEXT_APPLIED = Symbol("no-context-applied");

/**
 * Apply a map's initial view once per `contextKey`.
 *
 * The context is what the view is *about*: the map itself where there is one
 * view to establish (the field maps, the sensor map), or the subject it follows
 * where there are several — the detail map passes its sensor id, so navigating
 * to another sensor re-centres and nothing else does.
 *
 * `applyInitialView` returns whether it applied one: `false` means "not yet" —
 * the style isn't loaded or the data hasn't arrived — and keeps the one chance
 * open for a later render.
 *
 * Deliberately has no dependency array. What the initial view waits on differs
 * per map (points, bounds, coordinates, style readiness), and the callback's own
 * return value already says whether the wait is over, so re-checking each render
 * is both simpler and more robust than a dependency list every caller has to
 * keep correct. The check is two ref reads until it succeeds, and nothing at all
 * after that.
 */
export function useInitialMapView(
  contextKey: unknown,
  applyInitialView: () => boolean,
): void {
  const applyInitialViewRef = useRef(applyInitialView);
  applyInitialViewRef.current = applyInitialView;
  const appliedContextRef = useRef<unknown>(NO_CONTEXT_APPLIED);

  useEffect(() => {
    if (appliedContextRef.current === contextKey) return;
    if (applyInitialViewRef.current()) appliedContextRef.current = contextKey;
  });
}
