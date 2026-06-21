// Upstream API endpoints, in one dependency-free place.
//
// Kept free of any browser- or demo-specific imports so both the live API
// modules (src/api/*) and the Node-run snapshot capture script
// (scripts/capture-demo.ts) can import the same source of truth — the script
// can't import the api/* modules directly because those pull in the
// browser-only demo graph (see src/demo/).

/** Karlsruhe ArcGIS REST FeatureServer hosting the SensorCity layers. */
export const ARCGIS_BASE_URL =
  "https://geoportal.karlsruhe.de/ags04/rest/services/Hosted/Sensordaten_NodeRED/FeatureServer";

/** Hard service limit: a single ArcGIS query page returns at most this many rows. */
export const MAX_RECORD_COUNT = 2000;

/** PEGELONLINE water-gauge REST API. */
export const PEGELONLINE_BASE_URL =
  "https://www.pegelonline.wsv.de/webservices/rest-api/v2";

/** Bright Sky (DWD) weather API. */
export const BRIGHTSKY_BASE_URL = "https://api.brightsky.dev";

/** openSenseMap community sensor API. */
export const OPENSENSEMAP_BASE_URL = "https://api.opensensemap.org";

/** sensor.community (formerly luftdaten.info) open data API. */
export const SENSOR_COMMUNITY_BASE_URL = "https://data.sensor.community";

/**
 * Circular area around Karlsruhe used to scope sensor.community's area filter:
 * latitude, longitude and radius in kilometres.
 */
export const KARLSRUHE_AREA = {
  lat: 49.0069,
  lon: 8.4037,
  radiusKm: 8,
} as const;

/**
 * Bounding box around Karlsruhe used to scope openSenseMap community boxes.
 * Order is openSenseMap's `bbox` convention: minLng, minLat, maxLng, maxLat.
 */
export const KARLSRUHE_BBOX = {
  minLng: 8.27,
  minLat: 48.95,
  maxLng: 8.52,
  maxLat: 49.1,
} as const;

/** DWD Rheinstetten — the "undisturbed" out-of-city temperature baseline station. */
export const DWD_RHEINSTETTEN_STATION_ID = "04177";
