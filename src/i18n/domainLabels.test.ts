// Guards the config ↔ i18n seam.
//
// `config/layers.ts` holds upstream ids (category keys, measurement fields, layer
// ids); their display text lives in the `common` namespace, resolved by string
// key at render time. Nothing type-checks that seam: a category added to the
// config without a label renders the raw key ("categories.Foo.label"), and the
// EN/DE files can drift apart silently. These tests fail instead.
//
// The same class of gap let an upstream rename (`Temperatur` → `Temperatur-Sensor`)
// blank the temperature views without throwing.

import { describe, expect, it } from "vitest";

import { CATEGORIES, LAYERS } from "../config/layers";
import { resources } from "./resources";

const LANGUAGES = ["en", "de"] as const;

/** Every measurement field referenced by any category, de-duplicated. */
const MEASUREMENT_FIELDS = [
  ...new Set(CATEGORIES.flatMap((category) => category.measurements.map((m) => m.field))),
];

/** Collect an object's leaf key paths, e.g. "categories.Boden-Sensor.label". */
function leafKeyPaths(value: unknown, prefix = ""): string[] {
  if (value == null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafKeyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe.each(LANGUAGES)("%s common labels", (lang) => {
  const common = resources[lang].common as {
    categories: Record<string, { label: string }>;
    measurements: Record<string, { label: string }>;
    layers: Record<string, { label: string; description: string }>;
  };

  it.each(CATEGORIES.map((c) => c.key))("has a label for category %s", (key) => {
    expect(common.categories[key]?.label).toBeTruthy();
  });

  it.each(MEASUREMENT_FIELDS)("has a label for measurement %s", (field) => {
    expect(common.measurements[field]?.label).toBeTruthy();
  });

  it.each(LAYERS.map((l) => l.id))("has a label and description for layer %s", (id) => {
    expect(common.layers[String(id)]?.label).toBeTruthy();
    expect(common.layers[String(id)]?.description).toBeTruthy();
  });

  it("has no label for a category the config dropped", () => {
    const configured = new Set(CATEGORIES.map((c) => c.key));
    expect(Object.keys(common.categories).filter((k) => !configured.has(k))).toEqual([]);
  });

  it("has no label for a measurement no category uses", () => {
    const configured = new Set(MEASUREMENT_FIELDS);
    expect(Object.keys(common.measurements).filter((f) => !configured.has(f))).toEqual([]);
  });

  it("has no label for a layer the config dropped", () => {
    const configured = new Set(LAYERS.map((l) => String(l.id)));
    expect(Object.keys(common.layers).filter((id) => !configured.has(id))).toEqual([]);
  });
});

// CLAUDE.md requires the EN and DE files to stay structurally identical, so a
// key added to one is never silently missing from the other.
describe("EN/DE structural parity", () => {
  const namespaces = Object.keys(resources.en) as Array<keyof typeof resources.en>;

  it.each(namespaces)("%s has identical key paths in both languages", (namespace) => {
    const en = leafKeyPaths(resources.en[namespace]).sort();
    const de = leafKeyPaths(resources.de[namespace]).sort();
    expect(de).toEqual(en);
  });
});
