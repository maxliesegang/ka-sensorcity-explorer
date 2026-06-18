// Central registry of all translation namespaces. Each view owns a namespace
// file under locales/<lang>/<namespace>.ts; shared chrome lives in `common`.

import enCommon from "./locales/en/common";
import enOverview from "./locales/en/overview";
import enSensors from "./locales/en/sensors";
import enMap from "./locales/en/map";
import enTemperature from "./locales/en/temperature";
import enDetail from "./locales/en/detail";
import enQuery from "./locales/en/query";
import enAbout from "./locales/en/about";

import deCommon from "./locales/de/common";
import deOverview from "./locales/de/overview";
import deSensors from "./locales/de/sensors";
import deMap from "./locales/de/map";
import deTemperature from "./locales/de/temperature";
import deDetail from "./locales/de/detail";
import deQuery from "./locales/de/query";
import deAbout from "./locales/de/about";

export const resources = {
  en: {
    common: enCommon,
    overview: enOverview,
    sensors: enSensors,
    map: enMap,
    temperature: enTemperature,
    detail: enDetail,
    query: enQuery,
    about: enAbout,
  },
  de: {
    common: deCommon,
    overview: deOverview,
    sensors: deSensors,
    map: deMap,
    temperature: deTemperature,
    detail: deDetail,
    query: deQuery,
    about: deAbout,
  },
} as const;
