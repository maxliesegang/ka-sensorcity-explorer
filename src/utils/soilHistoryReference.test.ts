import { describe, expect, it } from "vitest";

import {
  buildSoilHistoryStats,
  classifySoilReading,
  MIN_REFERENCE_READINGS,
} from "./soilHistoryReference";

describe("buildSoilHistoryStats", () => {
  it("keeps min, mean and max but uses quartiles for the normal range", () => {
    const stats = buildSoilHistoryStats([0, 10, 11, 12, 13, 14, 15, 100]);
    expect(stats).toEqual({
      count: 8,
      min: 0,
      lowerQuartile: 10.75,
      median: 12.5,
      mean: 21.875,
      upperQuartile: 14.25,
      max: 100,
    });
  });

  it("requires enough history for a useful comparison", () => {
    expect(buildSoilHistoryStats(Array(MIN_REFERENCE_READINGS - 1).fill(20))).toBeNull();
  });
});

describe("classifySoilReading", () => {
  const stats = buildSoilHistoryStats([10, 11, 12, 13, 14, 15, 16, 17]);

  it("classifies readings against the middle half of their own history", () => {
    expect(classifySoilReading(10, stats)).toBe("lower");
    expect(classifySoilReading(13, stats)).toBe("normal");
    expect(classifySoilReading(17, stats)).toBe("higher");
  });

  it("marks a missing reference explicitly", () => {
    expect(classifySoilReading(13, null)).toBe("unavailable");
  });
});

