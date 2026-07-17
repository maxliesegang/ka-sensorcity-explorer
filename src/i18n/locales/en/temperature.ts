export default {
  badge: "City climate",
  heading: "How warm is Karlsruhe right now?",
  intro:
    "See warm and cool areas at a glance. Each area uses its nearest recent sensor; red is warmer and blue cooler relative to the other sensors.",
  introLinkPrefix: "Looking for every sensor instead? ",
  introLink: "Open the full sensor map",
  canvasAria: "Temperature map",
  mapAria: "Temperature field map of Karlsruhe",
  emptyToMap: "No recent temperature readings are available.",
  status: {
    loading: "Loading sensors…",
    error: "We couldn't load the map data.",
    showingRange_one:
      "{{count}} recently updated sensor on the map, reading {{min}}–{{max}} °C.",
    showingRange_other:
      "{{count}} recently updated sensors on the map, reading {{min}}–{{max}} °C.",
    showing_one: "{{count}} recently updated sensor on the map.",
    showing_other: "{{count}} recently updated sensors on the map.",
  },
  legend: {
    cooler: "Cooler",
    warmer: "Warmer",
    caption_one:
      "Each area uses its nearest recent sensor ({{count}} total).",
    caption_other:
      "Each area uses its nearest recent sensor ({{count}} total).",
  },
  popup: {
    viewDetails: "View details",
    setReference: "Set as reference",
  },
  combined: {
    badge: "City + community",
    heading: "Live temperatures across Karlsruhe",
    intro:
      "Compare live readings from the city's SensorCity network and nearby openSenseMap and sensor.community stations.",
    introLinkPrefix: "Prefer the city network alone? ",
    introLink: "Open the city-only temperature map",
    provider: {
      sensorcity: "SensorCity sensor",
      opensensemap: "openSenseMap community sensor",
      sensorcommunity: "sensor.community sensor",
    },
    viewOnProvider: "View on {{provider}}",
    providerBreakdown:
      "{{sensorcity}} city · {{opensensemap}} openSenseMap · {{sensorcommunity}} sensor.community",
    communityUnavailable:
      "Some community data is unavailable; showing the readings that loaded.",
    attribution:
      "Community readings via openSenseMap (opensensemap.org) and sensor.community, both licensed CC BY-SA 4.0.",
  },
  baseline: {
    modeAbsolute: "Absolute",
    modeDeviation: "Difference from baseline",
    modeLabel: "Colour mode",
    selectLabel: "Baseline",
    showLabels: "Show values on map",
    dwdOption: "Rheinstetten (DWD weather station)",
    averageOption: "Average of all sensors",
    legendCaption:
      "Difference from {{name}} — red is warmer, blue is cooler.",
    status_one:
      "Coloured by difference from {{name}} ({{count}} sensor).",
    status_other:
      "Coloured by difference from {{name}} ({{count}} sensors).",
    asOf: "Baseline reading from {{time}}.",
    dwdReading: "DWD baseline: {{value}} at {{time}}.",
    unavailableLive:
      "No live baseline station is available; showing absolute temperatures.",
    unavailable:
      "The selected baseline has no reading for this view; showing absolute temperatures.",
  },
  insights: {
    heading: "Temperature history analysis",
    intro:
      "Compare Karlsruhe's temperature sensors across the available archive.",
    selectedArchiveTime: "Selected archive time",
    empty: "No temperature sensor archive is available right now.",
    noCurrent:
      "At least two recent readings are needed for a live comparison.",
    live: {
      heading: "Live temperature statistics",
      intro:
        "Compare sensors updated within the last hour.",
    },
    cta: {
      hint: "This loads the full available archive for every temperature sensor and may take a few seconds.",
      button: "Load history analysis",
    },
    kpi: {
      spread: "Current spread",
      warmest: "Warmest now",
      coolest: "Coolest now",
      average: "City average now",
      averageDetail_one: "Across {{count}} sensor",
      averageDetail_other: "Across {{count}} sensors",
    },
    volatile: {
      label: "Most volatile sensor",
      body:
        "{{name}} has the widest historical range: {{range}} ({{min}} to {{max}}).",
    },
    tabs: {
      label: "Temperature history views",
      map: "Map replay",
      sensors: "Sensor ranking",
      spread: "Spread trend",
    },
    table: {
      caption: "Temperature comparison by sensor, in degrees Celsius",
      unitContext: "All values are in °C. Scroll horizontally to compare every column.",
      scrollLabel: "Scrollable per-sensor temperature ranking",
      sensor: "Sensor",
      now: "Now",
      min: "Min",
      max: "Max",
      average: "Avg",
      range: "Range",
      vsCity: "vs city avg",
      sortBy: "Sort by {{column}}",
      note: "“vs city avg” compares each current reading with the current city average ({{value}}). Positive values are warmer.",
    },
    spreadChart: {
      label: "City-wide temperature spread over time",
    },
    historyMap: {
      heading: "Historical temperature map",
      intro:
        "Replay the temperature map in {{hours}}-hour archive steps.",
      empty:
        "No historical map views are available in the archive.",
      mapAria: "Historical temperature Voronoi map of Karlsruhe",
      sliderLabel: "Archive time",
      status:
        "{{date}}: {{count}} sensors, {{min}}–{{max}} across the city.",
      baselineStatus_one:
        "{{date}}: Coloured by difference from {{name}} ({{count}} sensor).",
      baselineStatus_other:
        "{{date}}: Coloured by difference from {{name}} ({{count}} sensors).",
      legendCaption_one:
        "Each area uses its nearest sensor in this {{hours}}-hour interval ({{count}} sensor).",
      legendCaption_other:
        "Each area uses its nearest sensor in this {{hours}}-hour interval ({{count}} sensors).",
    },
  },
} as const;
