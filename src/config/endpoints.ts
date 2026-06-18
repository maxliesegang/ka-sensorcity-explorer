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

/** DWD Rheinstetten — the "undisturbed" out-of-city temperature baseline station. */
export const DWD_RHEINSTETTEN_STATION_ID = "04177";
