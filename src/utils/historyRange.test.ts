import { describe, expect, it } from "vitest";

import type { TimeSeriesPoint } from "../api/sensorcity";
import { buildHistoryWindow } from "./historyRange";

const DAY = 24 * 60 * 60 * 1000;

describe("buildHistoryWindow", () => {
  const points: TimeSeriesPoint[] = [
    { timestamp: 40 * DAY, value: 4 },
    { timestamp: 0, value: 0 },
    { timestamp: 39 * DAY, value: 3 },
    { timestamp: 10 * DAY, value: 1 },
    { timestamp: 30 * DAY, value: 2.5 },
    { timestamp: 33 * DAY, value: 2 },
  ];

  it("sorts and returns the full series", () => {
    expect(buildHistoryWindow(points, "all")?.points.map((point) => point.value)).toEqual(
      [0, 1, 2.5, 2, 3, 4],
    );
  });

  it("anchors presets to the latest available point", () => {
    expect(buildHistoryWindow(points, "day")?.points.map((point) => point.value)).toEqual(
      [3, 4],
    );
    expect(buildHistoryWindow(points, "week")?.points.map((point) => point.value)).toEqual(
      [2, 3, 4],
    );
  });

  it("returns no window for an empty series", () => {
    expect(buildHistoryWindow([], "month")).toBeNull();
  });

  it("moves backward and forward in fixed-size windows", () => {
    const latest = buildHistoryWindow(points, "week", 0);
    const previous = buildHistoryWindow(points, "week", 1);

    expect(latest).toMatchObject({
      start: 33 * DAY,
      end: 40 * DAY,
      hasEarlier: true,
      hasLater: false,
    });
    expect(previous).toMatchObject({
      start: 26 * DAY,
      end: 33 * DAY,
      hasEarlier: true,
      hasLater: true,
    });
    expect(previous?.points.map((point) => point.value)).toEqual([2.5]);
  });

  it("uses the archive extent and disables shifting for all history", () => {
    expect(buildHistoryWindow(points, "all", 5)).toMatchObject({
      start: 0,
      end: 40 * DAY,
      hasEarlier: false,
      hasLater: false,
    });
  });
});
