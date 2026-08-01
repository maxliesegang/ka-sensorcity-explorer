export default {
  presets: {
    latestLive: "Latest live sensors",
    weatherStations: "Weather stations",
  },
  presetsAria: "Ready-made queries",
  heading: "Query explorer",
  intro:
    "Run read-only ArcGIS queries for custom filters, fields and exports. Start with a preset or configure the request yourself.",
  layer: "Layer",
  runQuery: "Run query",
  advancedSettings: "Configure ArcGIS parameters",
  advancedHint: "Set the filter, returned fields, sort order and maximum number of rows.",
  // The selected layer's real columns, read from the service, so the attribute
  // names don't have to be known in advance.
  fields: {
    summary_one: "Show the layer's {{count}} field",
    summary_other: "Show the layer's {{count}} fields",
    summaryPending: "Show the layer's fields",
    hint: "Select fields to build outFields. Hover a name for its type.",
    empty: "This layer publishes no field list.",
  },
  resolvedUrl: "Resolved request URL",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Copy failed",
  running: "Running query…",
  noFeatures: "No rows match this query.",
  rows_one: "{{count}} row",
  rows_other: "{{count}} rows",
  resultContext: "Results from layer {{layer}}",
  downloadJson: "Download JSON",
  downloadCsv: "Download CSV",
  tableCaption: "Layer {{layer}} query results, {{count}} rows",
  pagination: {
    label: "Query result pages",
    previous: "Previous page",
    next: "Next page",
    status: "{{from}}–{{to}} of {{total}} · Page {{page}} of {{pages}}",
  },
  transferLimit:
    "Server limit reached. More rows may match. Refine the query or load the next server page. Downloads include only the returned rows.",
} as const;
