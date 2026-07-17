// Static description of the SensorCity data model.
//
// This is the single place to extend the app: add a category or a measurement
// here and the map, detail view and query view pick it up automatically.
//
// Display text is NOT stored here — labels and descriptions live in the i18n
// `common` namespace, keyed by the stable ids below (layer `id`, category `key`,
// measurement `field`). Use the `*LabelKey` helpers to resolve them with `t()`.

import type {
  Category,
  DepthProfile,
  DepthProfileRamp,
  LayerInfo,
  Measurement,
} from "../types";

/** The live "latest value per sensor" layer. */
export const LIVE_LAYER_ID = 1;

/** All FeatureServer layers, for the overview. */
export const LAYERS: LayerInfo[] = [
  { id: 1, name: "Sensordaten_Update", live: true },
  { id: 2, name: "NodeRED_Temperatur_Archiv", live: false },
  { id: 3, name: "NodeRED_Regenschreiber_Archiv", live: false },
  { id: 4, name: "NodeRED_Bodensensoren_Archiv", live: false },
];

/**
 * The weather/air category key — the only category carrying air temperature.
 * Exported because several modules filter on it; an upstream rename of this
 * `beschreibung` value fails silently (lookups and filters yield empty rather
 * than throwing), so it must have exactly one home.
 */
export const TEMPERATURE_CATEGORY_KEY = "Temperatur-Sensor";

/** The air-temperature measurement field, on both the live and archive layers. */
export const TEMPERATURE_FIELD_KEY = "temp";

/**
 * Soil probe depth bands, shallow→deep, as used in the `*_at_depth_<band>1` fields.
 *
 * The feed defines 8 bands but only 0–5 carry readings: every one of the 97
 * reporting probes returns the device's not-connected sentinel for bands 6 and 7
 * (-328 °C, below absolute zero, and -5 % moisture). They are excluded rather
 * than rendered as impossible values.
 */
export const SOIL_DEPTH_BANDS = [0, 1, 2, 3, 4, 5] as const;

/** A soil field family, i.e. one quantity sampled across {@link SOIL_DEPTH_BANDS}. */
type SoilFamily = "soil_moisture" | "soil_temperature";

/**
 * The upstream attribute name for one band of a soil family. The suffix is the
 * band number followed by a literal `1` (band 0 → `..._at_depth_01`, band 5 →
 * `..._at_depth_51`) — kept here so that quirk has a single home.
 */
function soilBandField(family: SoilFamily, band: number): string {
  return `${family}_at_depth_${band}1`;
}

/** One measurement per depth band for a soil field family. */
function soilBandMeasurements(family: SoilFamily, unit: string): Measurement[] {
  return SOIL_DEPTH_BANDS.map((band) => ({
    field: soilBandField(family, band),
    unit,
  }));
}

/**
 * The depth profile for a soil family: the same band fields as
 * {@link soilBandMeasurements}, ordered shallow→deep for the heatmap.
 */
function soilDepthProfile(
  family: SoilFamily,
  unit: string,
  ramp: DepthProfileRamp,
): DepthProfile {
  return {
    key: family,
    unit,
    ramp,
    bands: SOIL_DEPTH_BANDS.map((band) => ({
      field: soilBandField(family, band),
      band,
    })),
  };
}

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
    key: TEMPERATURE_CATEGORY_KEY,
    color: "#1f77b4",
    archiveLayerId: 2,
    // `pm10`, `pm25`, `windgeschwindigkeit`, `uv_a_strahlung` and `uv_b_strahlung`
    // are declared by the archive layer but hold no rows at all (0 of ~498k), and
    // the live layer does not expose them — listing them only renders empty charts.
    // Add them back here if the city starts publishing them.
    measurements: [
      { field: "temp", unit: "°C" },
      { field: "luftfeuchte", unit: "%" },
      { field: "press", unit: "Pa" },
      { field: "sonnenstrahlung", unit: "W/m²" },
      { field: "niederschlag", unit: "mm" },
    ],
  },
  {
    key: "Regenschreiber",
    color: "#8b5fc7",
    archiveLayerId: 3,
    measurements: [{ field: "clicks", unit: "" }],
  },
  {
    key: "Boden-Sensor",
    color: "#a9705a",
    archiveLayerId: 4,
    // Probes report stacked depth bands (shallow→deep). The older flat
    // `bodenfeuchte`/`bodentemperatur` fields still exist upstream but are now
    // empty for all but 2 of 99 sensors, so the bands are the real feed.
    measurements: [
      ...soilBandMeasurements("soil_moisture", "%"),
      ...soilBandMeasurements("soil_temperature", "°C"),
    ],
    // The same band fields again, grouped per quantity: the measurement list
    // charts one band at a time, the profile draws all bands as depth vs. time.
    depthProfiles: [
      soilDepthProfile("soil_moisture", "%", "moisture"),
      soilDepthProfile("soil_temperature", "°C", "temperature"),
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

export function getCategoryColor(key: string): string {
  return CATEGORY_BY_KEY.get(key)?.color ?? DEFAULT_COLOR;
}

// i18n key builders. Pair with `t()` from the `common` namespace, e.g.
// `t(categoryLabelKey(sensor.category))`.
export const categoryLabelKey = (key: string): string => `categories.${key}.label`;
export const measurementLabelKey = (field: string): string =>
  `measurements.${field}.label`;
export const depthProfileLabelKey = (key: string): string =>
  `depthProfiles.${key}.label`;
export const layerLabelKey = (id: number): string => `layers.${id}.label`;
export const layerDescriptionKey = (id: number): string =>
  `layers.${id}.description`;
