// Static description of the SensorCity data model.
//
// This is the single place to extend the app: add a category or a measurement
// here and the map, detail view and query view pick it up automatically.
//
// Display text is NOT stored here — labels and descriptions live in the i18n
// `common` namespace, keyed by the stable ids below (layer `id`, category `key`,
// measurement `field`). Use the `*LabelKey` helpers to resolve them with `t()`.

import type { Category, LayerInfo } from "../types";

/** The live "latest value per sensor" layer. */
export const LIVE_LAYER_ID = 1;

/** All FeatureServer layers, for the overview. */
export const LAYERS: LayerInfo[] = [
  { id: 1, name: "Sensordaten_Update", live: true },
  { id: 2, name: "NodeRED_Temperatur_Archiv", live: false },
  { id: 3, name: "NodeRED_TSK_Archiv", live: false },
  { id: 4, name: "NodeRED_Regenschreiber_Archiv", live: false },
  { id: 5, name: "NodeRED_Bodensensoren_Archiv", live: false },
];

/**
 * Sensor categories keyed by the live layer's `beschreibung` value. Each maps
 * to the archive layer holding its history and the measurements worth showing.
 *
 * `color` is a categorical accent (dots, card top-borders, chart strokes) read
 * directly in JS — inline styles, SVG, Leaflet — so it can't be a theme-aware
 * CSS variable. The hues are therefore tuned to mid-luminance values that clear
 * the 3:1 graphical-contrast bar against *both* the light (#fff) and dark KERN
 * surfaces, rather than the darker tones that only read well in light mode.
 */
export const CATEGORIES: Category[] = [
  {
    key: "Temperatur",
    color: "#1f77b4",
    archiveLayerId: 2,
    measurements: [
      { field: "temp", unit: "°C" },
      { field: "luftfeuchte", unit: "%" },
      { field: "press", unit: "Pa" },
      { field: "pm10", unit: "µg/m³" },
      { field: "pm25", unit: "µg/m³" },
      { field: "sonnenstrahlung", unit: "W/m²" },
      { field: "niederschlag", unit: "mm" },
      { field: "windgeschwindigkeit", unit: "m/s" },
    ],
  },
  {
    key: "TSK-Container",
    color: "#2e7d32",
    archiveLayerId: 3,
    measurements: [
      { field: "fillinglvl_percent", unit: "%" },
      { field: "temp", unit: "°C" },
    ],
  },
  {
    key: "Regenschreiber",
    color: "#8b5fc7",
    archiveLayerId: 4,
    measurements: [{ field: "clicks", unit: "" }],
  },
  {
    key: "Boden-Sensor",
    color: "#a9705a",
    archiveLayerId: 5,
    measurements: [
      { field: "bodenfeuchte", unit: "%" },
      { field: "bodentemperatur", unit: "°C" },
    ],
  },
  {
    key: "Wasserpegel-Sensor",
    color: "#0f7d8c",
    // The current FeatureServer publishes these gauges only on the live layer.
    measurements: [{ field: "pegel", unit: "cm" }],
  },
];

const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

export function getCategory(key: string): Category | undefined {
  return CATEGORY_BY_KEY.get(key);
}

/** Fallback colour for unknown categories. */
export const DEFAULT_COLOR = "#777";

export function categoryColor(key: string): string {
  return CATEGORY_BY_KEY.get(key)?.color ?? DEFAULT_COLOR;
}

// i18n key builders. Pair with `t()` from the `common` namespace, e.g.
// `t(categoryLabelKey(sensor.category))`.
export const categoryLabelKey = (key: string): string => `categories.${key}.label`;
export const measurementLabelKey = (field: string): string =>
  `measurements.${field}.label`;
export const layerLabelKey = (id: number): string => `layers.${id}.label`;
export const layerDescriptionKey = (id: number): string =>
  `layers.${id}.description`;
