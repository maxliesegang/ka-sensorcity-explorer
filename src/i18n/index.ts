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

// Keep <html lang> in step with the active language: index.html ships `en`, and
// without this a screen reader announces the German UI in an English voice
// (WCAG 3.1.1). Bound to the i18n singleton rather than to a React effect —
// the document language follows the language, not a route or a mounted view.
function syncDocumentLanguage(language: string | undefined) {
  const resolved = language ?? i18n.resolvedLanguage ?? i18n.language;
  if (resolved && typeof document !== "undefined") {
    document.documentElement.lang = resolved;
  }
}

i18n.on("languageChanged", syncDocumentLanguage);
syncDocumentLanguage(undefined);

export default i18n;
