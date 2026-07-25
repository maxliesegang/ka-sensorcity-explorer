import { describe, expect, it } from "vitest";

import { buildSoilDeviationScale, buildSoilValueScale } from "./soilFieldScale";

describe("buildSoilValueScale", () => {
  it("returns nothing when there is nothing to colour", () => {
    expect(buildSoilValueScale("temperature", [])).toBeNull();
    expect(buildSoilDeviationScale("moisture", [])).toBeNull();
  });

  it("spans every band, so one band's colours are the other's", () => {
    const allBands = buildSoilValueScale("temperature", [18, 22, 26, 30]);
    const shallowOnly = buildSoilValueScale("temperature", [18, 22]);
    expect(allBands?.min).toBe(18);
    expect(allBands?.max).toBe(30);
    // Same reading, different domain -> different colour. Passing every band's
    // values is what keeps a band switch comparable.
    expect(allBands?.css(22)).not.toBe(shallowOnly?.css(22));
  });

  it("keeps soil temperature on the warm-is-red temperature spectrum", () => {
    const scale = buildSoilValueScale("temperature", [5, 30]);
    expect(scale?.css(5)).not.toBe(scale?.css(30));
    expect(scale?.zeroPos).toBeNull();
  });

  it("widens a narrow moisture range so a uniform city stays uniform", () => {
    const scale = buildSoilValueScale("moisture", [30, 32]);
    expect(scale?.min).toBe(26);
    expect(scale?.max).toBe(36);
  });

  it("spans the data when moisture is spread wider than the floor", () => {
    const scale = buildSoilValueScale("moisture", [10, 70]);
    expect(scale?.min).toBe(10);
    expect(scale?.max).toBe(70);
  });
});

describe("buildSoilDeviationScale", () => {
  it("centres zero on a symmetric domain for both quantities", () => {
    for (const scale of [
      buildSoilDeviationScale("temperature", [-1, 4]),
      buildSoilDeviationScale("moisture", [-3, 9]),
    ]) {
      expect(scale?.zeroPos).toBe(0.5);
      expect(scale?.min).toBe(-(scale?.max ?? 0));
      expect(scale?.css(-2)).not.toBe(scale?.css(2));
    }
  });

  it("gives equal-and-opposite differences equal weight", () => {
    const scale = buildSoilDeviationScale("temperature", [-1, 5]);
    expect(scale?.css(0)).toBe(buildSoilDeviationScale("temperature", [-5, 1])?.css(0));
    expect(scale?.max).toBe(5);
  });
});
