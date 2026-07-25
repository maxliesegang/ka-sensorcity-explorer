import { describe, expect, it } from "vitest";

import { resources } from "./resources";

/**
 * The German dictionaries must mirror the English ones key for key: a missing key
 * falls back to the English string silently, so a half-translated namespace looks
 * fine in review and shows up as stray English in the running app.
 */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("translation resources", () => {
  const namespaces = Object.keys(resources.en) as (keyof typeof resources.en)[];

  it("registers the same namespaces in both languages", () => {
    expect(Object.keys(resources.de).sort()).toEqual([...namespaces].sort());
  });

  it.each(namespaces)("has structurally identical keys in %s", (namespace) => {
    expect(keyPaths(resources.de[namespace]).sort()).toEqual(
      keyPaths(resources.en[namespace]).sort(),
    );
  });
});
