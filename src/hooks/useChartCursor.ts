// Keyboard/pointer cursor shared by the SVG charts.
//
// Both charts highlight one index of a series — a point on the line, a column of
// the depth grid — and both must be operable without a mouse (WCAG 2.1.1). That
// contract is identical either way, so it lives here: a fix or a new key binding
// lands in both charts at once rather than in whichever one it was noticed on.

import { useCallback, useMemo, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

import { nearestIndexAtX, CHART_WIDTH } from "../utils/chartGeometry";

export interface ChartCursor {
  /** Highlighted index, or null when nothing is highlighted. */
  index: number | null;
  /** Set or clear the highlight — for the chart's own pointer hit-testing, which
   *  differs per chart (nearest point vs. column under the pointer). */
  setIndex(index: number | null): void;
  /** Spread onto the chart's `<svg>`: keyboard stepping, focus and blur. */
  svgProps: {
    tabIndex: number;
    onKeyDown(event: KeyboardEvent<SVGSVGElement>): void;
    onFocus(): void;
    onMouseLeave(): void;
  };
}

/** Cursor over a series of `count` indices. */
export function useChartCursor(count: number): ChartCursor {
  const [index, setIndex] = useState<number | null>(null);

  const step = useCallback(
    (delta: number) => {
      setIndex((current) => {
        const next = (current == null ? 0 : current) + delta;
        return Math.max(0, Math.min(count - 1, next));
      });
    },
    [count],
  );

  const svgProps = useMemo(
    () => ({
      tabIndex: 0,
      onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
        if (event.key === "ArrowRight") step(1);
        else if (event.key === "ArrowLeft") step(-1);
        else if (event.key === "Home") setIndex(0);
        else if (event.key === "End") setIndex(count - 1);
        // Only swallow the keys actually handled: Tab must still move on, and
        // arrows must still scroll the page when the chart has no focus.
        else return;
        event.preventDefault();
      },
      // Focus lands on the first index so a keyboard user has a cursor to move,
      // but never discards one they already placed.
      onFocus() {
        setIndex((current) => (current == null ? 0 : current));
      },
      onMouseLeave() {
        setIndex(null);
      },
    }),
    [count, step],
  );

  return { index, setIndex, svgProps };
}

/**
 * The pointer half of the same cursor: the index of the mark nearest the mouse.
 *
 * `markXs` are mark positions in the chart's own viewBox space (ascending), not
 * data values — the SVG scales to fit its container, so the client x is mapped
 * back through the rendered width first. Charts that hit-test differently (the
 * depth grid takes the column *under* the pointer, not the nearest mark) keep
 * doing their own thing and call `setIndex` directly.
 */
export function nearestIndexFromPointer(
  event: MouseEvent<SVGSVGElement>,
  markXs: readonly number[],
  width: number = CHART_WIDTH,
): number | null {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.width === 0) return null;
  return nearestIndexAtX(markXs, ((event.clientX - rect.left) / rect.width) * width);
}
