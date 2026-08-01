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
    deviation_one:
      "{{count}} probe at {{band}}, coloured by difference from {{name}}.",
    deviation_other:
      "{{count}} probes at {{band}}, coloured by difference from {{name}}.",
  },
  controls: {
    quantityLabel: "Soil quantity",
    bandLabel: "Depth level",
    shallowest: "Near surface",
    deepest: "Deepest",
  },
  baseline: {
    displayModeLabel: "Map values",
    valueMode: "Readings",
    deviationMode: "Difference from baseline",
    selectLabel: "Baseline probe",
    showLabels: "Show values on map",
    showCells: "Show area shading",
    averageOption: "Average of all probes",
    reading: "{{name}} at {{band}}: {{value}}.",
    unavailable:
      "The chosen baseline has no reading at {{band}}; showing values.",
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
    deviationCaption:
      "Difference from {{name}}, compared at {{band}} — the same depth on both sides.",
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
    setReference: "Set as reference",
  },
} as const;
