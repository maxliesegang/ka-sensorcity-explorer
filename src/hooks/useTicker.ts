import { useSyncExternalStore } from "react";

/** How often the shared clock advances. `timeAgo` has minute granularity, so
 * this is fast enough that "3 min ago" is never more than a moment behind. */
const TICK_MS = 30_000;

// One clock for the whole app, not one per component. `/sensors` renders a
// freshness badge per row, and a timer each would mean dozens of intervals and
// dozens of separate render passes every tick; subscribing them all to a single
// interval makes that one timer and one batched update.
//
// The interval only runs while something is subscribed *and* the tab is
// visible: a backgrounded tab has nobody reading its clock, and browsers
// throttle it anyway. Coming back into view re-reads the clock immediately, so
// the first paint after a return is already current.
const subscribers = new Set<() => void>();
let now = Date.now();
let timer: number | undefined;

function emit() {
  now = Date.now();
  for (const notify of subscribers) notify();
}

function isVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function syncTimer() {
  const shouldRun = subscribers.size > 0 && isVisible();
  if (shouldRun && timer === undefined) {
    timer = window.setInterval(emit, TICK_MS);
  } else if (!shouldRun && timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

function onVisibilityChange() {
  if (isVisible()) emit();
  syncTimer();
}

function subscribe(notify: () => void): () => void {
  if (subscribers.size === 0) {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  subscribers.add(notify);
  syncTimer();
  return () => {
    subscribers.delete(notify);
    syncTimer();
    if (subscribers.size === 0) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}

/**
 * Re-render on the shared clock so relative times ("5 min ago") keep telling the
 * truth on a page nobody is touching. Returns the current epoch-ms, which also
 * makes the value usable as a `useMemo` dependency.
 */
export function useTicker(): number {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => now,
  );
}
