import { describe, expect, it } from "vitest";

import { getWaterTrend, WATER_TREND_WINDOW_MS } from "./waterTrend";

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 6, 31, 12);

/** A gauge series ending at `NOW`, one point per hour, oldest first. */
const series = (...values: number[]) =>
  values.map((value, index) => ({
    timestamp: NOW - (values.length - 1 - index) * HOUR,
    value,
  }));

describe("getWaterTrend", () => {
  it("measures the change across the window, not across the whole archive", () => {
    // 25 hourly points: 24 h ago … now. The window starts 12 h back, at 200.
    const points = series(...Array.from({ length: 25 }, (_, i) => 100 + i * 10));

    expect(getWaterTrend(points)).toEqual({
      direction: "rising",
      delta: 120,
      from: NOW - 12 * HOUR,
      to: NOW,
    });
  });

  it("ends the window at the newest reading, not at the clock", () => {
    // A stale archive: the newest point is a day old. The trend is still the
    // 12 h before *it*, and says so through `from`/`to`.
    const stale = series(...Array.from({ length: 25 }, () => 0)).map((point) => ({
      ...point,
      timestamp: point.timestamp - 24 * HOUR,
    }));
    stale[stale.length - 1].value = 5;
    stale[stale.length - 13].value = 20;

    expect(getWaterTrend(stale)).toMatchObject({
      direction: "falling",
      delta: -15,
      to: NOW - 24 * HOUR,
    });
  });

  it("calls a centimetre of drift steady rather than a trend", () => {
    const points = series(...Array.from({ length: 13 }, (_, i) => (i === 0 ? 40 : 40.6)));

    const trend = getWaterTrend(points);
    expect(trend?.direction).toBe("steady");
    expect(trend?.delta).toBeCloseTo(0.6);
  });

  it("has no answer for a series shorter than the window", () => {
    expect(getWaterTrend(series(10, 20, 30))).toBeNull();
    expect(getWaterTrend([])).toBeNull();
  });

  it("takes the window length from the caller", () => {
    const points = series(10, 20, 30);

    expect(getWaterTrend(points, HOUR)).toMatchObject({ delta: 10 });
    expect(WATER_TREND_WINDOW_MS).toBe(12 * HOUR);
  });
});
