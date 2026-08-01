export default {
  presets: {
    latestLive: "Aktuelle Live-Sensoren",
    weatherStations: "Wetterstationen",
  },
  presetsAria: "Vorgefertigte Abfragen",
  heading: "Abfrage-Explorer",
  intro:
    "Schreibgeschützte ArcGIS-Abfragen für eigene Filter, Felder und Exporte ausführen. Mit einer Vorlage starten oder die Anfrage selbst konfigurieren.",
  layer: "Layer",
  runQuery: "Abfrage ausführen",
  advancedSettings: "ArcGIS-Parameter konfigurieren",
  advancedHint: "Filter, ausgegebene Felder, Sortierung und maximale Zeilenzahl festlegen.",
  // The selected layer's real columns, read from the service, so the attribute
  // names don't have to be known in advance.
  fields: {
    summary_one: "{{count}} Feld dieses Layers anzeigen",
    summary_other: "{{count}} Felder dieses Layers anzeigen",
    summaryPending: "Felder dieses Layers anzeigen",
    hint: "Felder auswählen, um outFields zu bauen. Für den Typ auf einen Namen zeigen.",
    empty: "Dieser Layer veröffentlicht keine Feldliste.",
  },
  resolvedUrl: "Aufgelöste Anfrage-URL",
  copy: "Kopieren",
  copied: "Kopiert",
  copyFailed: "Kopieren fehlgeschlagen",
  running: "Abfrage wird ausgeführt…",
  noFeatures: "Keine Zeilen entsprechen dieser Abfrage.",
  rows_one: "{{count}} Zeile",
  rows_other: "{{count}} Zeilen",
  resultContext: "Ergebnisse aus Layer {{layer}}",
  downloadJson: "JSON herunterladen",
  downloadCsv: "CSV herunterladen",
  tableCaption: "Abfrageergebnisse für Layer {{layer}}, {{count}} Zeilen",
  pagination: {
    label: "Ergebnisseiten der Abfrage",
    previous: "Vorherige Seite",
    next: "Nächste Seite",
    status: "{{from}}–{{to}} von {{total}} · Seite {{page}} von {{pages}}",
  },
  transferLimit:
    "Serverlimit erreicht. Möglicherweise passen weitere Zeilen. Grenzen Sie die Abfrage ein oder rufen Sie die nächste Serverseite ab. Downloads enthalten nur die zurückgegebenen Zeilen.",
} as const;
