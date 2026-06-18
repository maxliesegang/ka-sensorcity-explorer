export default {
  presets: {
    latestLive: "Aktuelle Live-Sensoren",
    weatherStations: "Wetterstationen",
    fullContainers: "Volle Container",
  },
  presetsAria: "Abfrage-Voreinstellungen",
  badge: "Erweiterte Abfrage",
  heading: "Abfrage-Explorer",
  intro:
    "Erweitert: Rohabfragen gegen den schreibgeschützten öffentlichen ArcGIS-FeatureServer erstellen und ausführen. Es werden keine Daten geschrieben — nur Abfragen.",
  layer: "Layer",
  runQuery: "Abfrage ausführen",
  resolvedUrl: "Aufgelöste Anfrage-URL",
  copy: "Kopieren",
  copied: "Kopiert",
  copyFailed: "Kopieren fehlgeschlagen",
  running: "Abfrage wird ausgeführt…",
  noFeatures: "Keine Objekte gefunden.",
  rows_one: "{{count}} Zeile",
  rows_other: "{{count}} Zeilen",
  transferLimit:
    "Übertragungslimit erreicht — es sind weitere Zeilen verfügbar. Grenzen Sie die Abfrage ein oder erhöhen Sie resultRecordCount.",
} as const;
