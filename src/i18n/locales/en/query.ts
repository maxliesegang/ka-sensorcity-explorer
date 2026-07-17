export default {
  presets: {
    latestLive: "Latest live sensors",
    weatherStations: "Weather stations",
  },
  presetsAria: "Query presets",
  badge: "Advanced query",
  heading: "Query explorer",
  intro:
    "Advanced: build and run raw requests against the read-only public ArcGIS FeatureServer. Nothing is written — queries only.",
  layer: "Layer",
  runQuery: "Run query",
  resolvedUrl: "Resolved request URL",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Copy failed",
  running: "Running query…",
  noFeatures: "No features matched.",
  rows_one: "{{count}} row",
  rows_other: "{{count}} rows",
  transferLimit:
    "Transfer limit reached — more rows are available. Narrow the query or raise resultRecordCount.",
} as const;
