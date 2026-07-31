import { describe, expect, it } from "vitest";

import {
  bandPath,
  buildTimeValueScale,
  linePath,
  nearestIndexAtX,
  CHART_PAD,
  CHART_WIDTH,
} from "./chartGeometry";

const HEIGHT = 240;

describe("buildTimeValueScale", () => {
  it("maps the extent onto the plot area, with y inverted", () => {
    const scale = buildTimeValueScale(
      { minX: 100, maxX: 300, minY: 10, maxY: 20 },
      HEIGHT,
    );

    expect(scale.x(100)).toBe(CHART_PAD.left);
    expect(scale.x(300)).toBe(CHART_WIDTH - CHART_PAD.right);
    // Larger values sit higher, so maxY lands on the top padding.
    expect(scale.y(20)).toBe(CHART_PAD.top);
    expect(scale.y(10)).toBe(HEIGHT - CHART_PAD.bottom);
    expect(scale.y(15)).toBeCloseTo((CHART_PAD.top + HEIGHT - CHART_PAD.bottom) / 2);
  });

  it("stays finite for a single point and for a flat series", () => {
    const scale = buildTimeValueScale(
      { minX: 5, maxX: 5, minY: 7, maxY: 7 },
      HEIGHT,
    );
    expect(Number.isFinite(scale.x(5))).toBe(true);
    expect(Number.isFinite(scale.y(7))).toBe(true);
  });
});

describe("linePath and bandPath", () => {
  it("draws a polyline through the points in order", () => {
    expect(linePath([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe("M1.0,2.0 L3.0,4.0");
    expect(linePath([])).toBe("");
  });

  it("closes a band forward along the upper edge and back along the lower", () => {
    expect(
      bandPath(
        [{ x: 0, y: 1 }, { x: 10, y: 2 }],
        [{ x: 0, y: 5 }, { x: 10, y: 6 }],
      ),
    ).toBe("M0.0,1.0 L10.0,2.0 L10.0,6.0 L0.0,5.0 Z");
    expect(bandPath([], [{ x: 0, y: 1 }])).toBe("");
  });
});

describe("nearestIndexAtX", () => {
  const xs = [0, 10, 20, 30, 40];

  it("finds the closest index on either side and clamps past both ends", () => {
    expect(nearestIndexAtX(xs, 21)).toBe(2);
    expect(nearestIndexAtX(xs, 29)).toBe(3);
    expect(nearestIndexAtX(xs, -100)).toBe(0);
    expect(nearestIndexAtX(xs, 1000)).toBe(4);
  });

  it("prefers the earlier index when a point sits exactly between two", () => {
    expect(nearestIndexAtX(xs, 15)).toBe(1);
  });

  it("returns null for an empty series", () => {
    expect(nearestIndexAtX([], 5)).toBeNull();
  });

  it("agrees with a linear scan over a long series", () => {
    const long = Array.from({ length: 500 }, (_, i) => i * 7);
    const scan = (x: number) =>
      long.reduce(
        (best, value, i) =>
          Math.abs(value - x) < Math.abs(long[best] - x) ? i : best,
        0,
      );
    for (let x = -20; x < 3600; x += 13) {
      expect(nearestIndexAtX(long, x)).toBe(scan(x));
    }
  });
});
