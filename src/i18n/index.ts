// i18next initialization. Languages are detected from localStorage → browser,
// falling back to English, and the chosen language is persisted to localStorage
// (mirroring how the theme preference is stored).

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { resources } from "./resources";

export const SUPPORTED_LANGUAGES = ["en", "de"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "ka-sensorcity-lang";

/** All namespaces are bundled, so every one is available everywhere. */
export const NAMESPACES = [
  "common",
  "overview",
  "sensors",
  "map",
  "temperature",
  "detail",
  "query",
  "about",
] as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: NAMESPACES,
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export default i18n;
