export default {
  heading: "What is the soil doing right now?",
  intro:
    "The city's soil probes at their locations. Each measures at six depth levels; pick a level with the strip below.",
  introCaveat:
    "Soil differs sharply over a few metres — shade, grass, asphalt — so a probe reflects its spot, not the whole block.",
  introLinkPrefix: "Want one probe over time instead? ",
  introLink: "Open the sensor list",
  notConfigured: "No banded soil quantities are configured.",
  canvasAria: "Soil map",
  mapAria: "Soil field map of Karlsruhe",
  empty: "No recent soil readings.",
  emptyBand: "No probes report a recent reading at {{band}}. Choose another depth level.",
  status: {
    loading: "Loading probes…",
    error: "We couldn't load the map data.",
    showingRange_one: "{{count}} probe at {{band}}, reading {{min}}–{{max}}.",
    showingRange_other: "{{count}} probes at {{band}}, reading {{min}}–{{max}}.",
    showing_one: "{{count}} probe at {{band}}.",
    showing_other: "{{count}} probes at {{band}}.",
    referenceLoading: "Comparing history…",
    referenceError: "The comparison is unavailable; showing readings.",
    reference_one: "{{referenceCount}} of {{count}} probe compared · {{band}}.",
    reference_other: "{{referenceCount}} of {{count}} probes compared · {{band}}.",
  },
  controls: {
    quantityLabel: "Soil quantity",
    bandLabel: "Depth level",
    shallowest: "Near surface",
    deepest: "Deepest",
  },
  comparisonCallout: {
    heading: "Is this spot unusual right now?",
    hint:
      "Compare each probe with its own last 30 days to spot soil that is drier, wetter, cooler, or warmer than usual.",
    button: "Compare with history",
  },
  baseline: {
    displayModeLabel: "Map values",
    valueMode: "Readings",
    deviationMode: "Compared",
    showLabels: "Show values on map",
    showCells: "Show area shading",
  },
  reference: {
    heading: "How comparison works",
    status: {
      lower: { moisture: "Drier", temperature: "Cooler" },
      normal: { moisture: "Normal", temperature: "Normal" },
      higher: { moisture: "Wetter", temperature: "Warmer" },
      unavailable: { moisture: "No history", temperature: "No history" },
    },
    noData: "No history",
    caption:
      "Current reading at {{band}} compared with the last {{days}} days. Normal is the middle half of those readings.",
    partial_one: "History is missing for {{count}} probe.",
    partial_other: "History is missing for {{count}} probes.",
  },
  legend: {
    temperature: {
      low: "Cooler",
      high: "Warmer",
    },
    moisture: {
      low: "Drier",
      high: "Wetter",
    },
    caption_one:
      "Each probe at {{band}} ({{count}} total). One colour scale spans every depth level, so levels compare directly.",
    caption_other:
      "Each probe at {{band}} ({{count}} total). One colour scale spans every depth level, so levels compare directly.",
  },
  bands: {
    heading: "Every depth level at once",
    intro:
      "The map colours one level at a time; this is the whole column, as measured across the city right now.",
    caption:
      "City-wide spread per depth level, shallowest first. Values are always as measured, even while the map shows differences.",
    median: "Median",
    range: "Range",
    probes: "Probes",
    onMap: "(on the map)",
  },
  popup: {
    viewDetails: "View details",
    reference: "{{status}} · usual {{usualMin}}–{{usualMax}} · avg {{mean}}",
    noReference: "Not enough history yet.",
  },
} as const;
