import { describe, expect, it } from "vitest";

import { toBool, toBoolParam, toEnum, toPositiveInt } from "./urlParams";

describe("toEnum", () => {
  const allowed = ["cards", "table"] as const;

  it("returns the value when it is one of the allowed", () => {
    expect(toEnum("table", allowed, "cards")).toBe("table");
  });

  it("falls back for an absent or unknown value", () => {
    expect(toEnum(null, allowed, "cards")).toBe("cards");
    expect(toEnum("grid", allowed, "cards")).toBe("cards");
  });
});

describe("toPositiveInt", () => {
  it("parses a positive integer", () => {
    expect(toPositiveInt("42", 1)).toBe(42);
  });

  it("falls back for non-integers, zero, negatives and null", () => {
    expect(toPositiveInt("0", 1)).toBe(1);
    expect(toPositiveInt("-3", 1)).toBe(1);
    expect(toPositiveInt("2.5", 1)).toBe(1);
    expect(toPositiveInt("abc", 1)).toBe(1);
    expect(toPositiveInt(null, 1)).toBe(1);
  });
});

describe("toBool / toBoolParam", () => {
  it("parses the recognized truthy and falsy encodings", () => {
    expect(toBool("1", false)).toBe(true);
    expect(toBool("true", false)).toBe(true);
    expect(toBool("0", true)).toBe(false);
    expect(toBool("false", true)).toBe(false);
  });

  it("falls back for anything unrecognized", () => {
    expect(toBool(null, true)).toBe(true);
    expect(toBool("", false)).toBe(false);
    expect(toBool("yes", false)).toBe(false);
  });

  it("round-trips through toBoolParam", () => {
    expect(toBool(toBoolParam(true), false)).toBe(true);
    expect(toBool(toBoolParam(false), true)).toBe(false);
  });
});
