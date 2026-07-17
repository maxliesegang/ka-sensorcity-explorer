// Shared domain types for the SensorCity explorer.
//
// The upstream API is an ArcGIS REST FeatureServer. Attribute values are
// loosely typed by the service, so we model a feature attribute bag as a
// permissive record and narrow at the point of use.

export type AttributeValue = string | number | boolean | null;
export type Attributes = Record<string, AttributeValue>;

/** A single ArcGIS feature: attribute bag plus optional point geometry. */
export interface Feature {
  attributes: Attributes;
  geometry?: { x: number; y: number } | null;
}

/** Shape of a `/query` response (the parts we consume). */
export interface QueryResponse {
  features: Feature[];
  fields?: FieldInfo[];
  exceededTransferLimit?: boolean;
  geometryType?: string;
  error?: { code: number; message: string };
}

export interface FieldInfo {
  name: string;
  type: string;
  alias?: string;
}

/**
 * One measurement field exposed by a sensor category. Display labels live in
 * the i18n `common.measurements.<field>` namespace, keyed by `field`.
 */
export interface Measurement {
  /** Attribute name in the API, e.g. `temp`. Also the translation key. */
  field: string;
  /** Optional unit suffix, e.g. "°C". Units are not translated. */
  unit?: string;
}

/**
 * The sequential colour ramp a depth profile is drawn with. Named by what it
 * encodes rather than by its hue, so the ramp can be retuned in one place
 * (`utils/depthProfileScale.ts`) without touching the data model.
 */
export type DepthProfileRamp = "moisture" | "temperature";

/** One depth band of a {@link DepthProfile}. */
export interface DepthBand {
  /** Attribute name in the API, e.g. `soil_moisture_at_depth_21`. */
  field: string;
  /**
   * Ordinal depth index, 0 = shallowest. The feed publishes no real depths (cm),
   * only stacked bands, so this is a rank and never rendered as a distance.
   */
  band: number;
}

/**
 * A family of measurements sampling one quantity at stacked depths, drawn as a
 * depth-vs-time heatmap. Display labels live in the i18n
 * `common.depthProfiles.<key>` namespace, keyed by `key`.
 */
export interface DepthProfile {
  /** Stable id; also the translation key. */
  key: string;
  /** Optional unit suffix, e.g. "°C". Units are not translated. */
  unit?: string;
  /** Which sequential ramp encodes this quantity's magnitude. */
  ramp: DepthProfileRamp;
  /** Bands ordered shallow→deep. */
  bands: DepthBand[];
}

/**
 * A sensor category, keyed by the live layer's `beschreibung` value. Drives
 * map colours, the measurements shown in detail, and which archive layer holds
 * this category's history. Display labels live in the i18n
 * `common.categories.<key>` namespace, keyed by `key`.
 */
export interface Category {
  /** Matches the `beschreibung` attribute on the live layer; the translation key. */
  key: string;
  /** Marker / accent colour. */
  color: string;
  /** Archive layer id holding this category's history, if any. */
  archiveLayerId?: number;
  /** Measurements to surface; the first is treated as primary. */
  measurements: Measurement[];
  /**
   * Depth-banded measurement families, if this category's probes sample at
   * stacked depths. Requires `archiveLayerId` — the profile is drawn from
   * archive history.
   */
  depthProfiles?: DepthProfile[];
}

/**
 * Metadata describing one FeatureServer layer. Display label/description live
 * in the i18n `common.layers.<id>` namespace, keyed by `id`.
 */
export interface LayerInfo {
  id: number;
  /** Raw service name, shown verbatim (not translated). */
  name: string;
  /** Whether this is the live "latest value" layer (vs. a history archive). */
  live: boolean;
}

/** A normalized sensor from the live layer, ready for the UI. */
export interface Sensor {
  objectId: number;
  deviceId: string;
  name: string;
  /** The live layer's `beschreibung` value; keys into `CATEGORIES`. */
  category: string;
  lat: number | null;
  lon: number | null;
  measuredAt: number | null;
  attributes: Attributes;
}
