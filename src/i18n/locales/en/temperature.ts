export default {
  badge: "City climate",
  heading: "How warm is Karlsruhe right now?",
  intro:
    "A live temperature map of Karlsruhe, with each area coloured by its nearest sensor so warm and cool spots stand out at a glance. Colours rank the sensors against each other right now — reddest is warmest, bluest coolest.",
  introLinkPrefix: "Looking for every sensor instead? ",
  introLink: "Open the full sensor map",
  canvasAria: "Temperature field canvas",
  mapAria: "Temperature field map of Karlsruhe",
  emptyToMap: "No recently updated temperature sensors to show right now.",
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
      "Each area is coloured by its nearest recently updated sensor ({{count}} total).",
    caption_other:
      "Each area is coloured by its nearest recently updated sensor ({{count}} total).",
  },
  popup: {
    viewDetails: "View details",
    setReference: "Set as reference",
  },
  combined: {
    badge: "City + community",
    heading: "Live temperatures across Karlsruhe",
    intro:
      "A live temperature map that blends the city's SensorCity network with nearby openSenseMap and sensor.community citizen stations, so the field is filled in wherever someone is measuring.",
    introLinkPrefix: "Prefer the city network alone? ",
    introLink: "Open the city-only temperature map",
    source: {
      sensorcity: "SensorCity sensor",
      opensensemap: "openSenseMap community sensor",
      sensorcommunity: "sensor.community sensor",
    },
    viewOnSource: "View on {{source}}",
    sourceBreakdown:
      "{{city}} city · {{opensensemap}} openSenseMap · {{sensorcommunity}} sensor.community",
    communityUnavailable:
      "Some community sensor data is unavailable right now; showing what loaded.",
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
      "How Karlsruhe's temperature sensors compare across the full retained archive.",
    selectedArchiveTime: "Selected archive time",
    empty: "No temperature sensor archive is available right now.",
    noCurrent:
      "At least two recent temperature readings are needed to compare sensors right now.",
    live: {
      heading: "Live temperature statistics",
      intro:
        "A direct comparison of temperature sensors updated within the last hour.",
    },
    cta: {
      hint: "Building this history analysis fetches the full retained archive for every temperature sensor, so it may take a few seconds.",
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
        "{{name}} swings the most, with a historical range of {{range}} (from {{min}} to {{max}}).",
    },
    tabs: {
      label: "Temperature history views",
      map: "Map replay",
      sensors: "Sensor ranking",
      spread: "Spread trend",
    },
    table: {
      caption: "Per-sensor temperature comparison",
      sensor: "Sensor",
      now: "Now",
      min: "Min",
      max: "Max",
      average: "Avg",
      range: "Range",
      vsCity: "vs city avg",
      sortBy: "Sort by {{column}}",
      note: "“vs city avg” is each sensor's current reading minus the city-wide average right now ({{value}}); a positive value means warmer than average.",
    },
    spreadChart: {
      label: "City-wide temperature spread over time",
    },
    historyMap: {
      heading: "Historical temperature map",
      intro:
        "Replay the city-wide Voronoi temperature field in {{hours}}-hour archive steps.",
      empty:
        "No historical map frames are available for the retained temperature archive.",
      mapAria: "Historical temperature Voronoi map of Karlsruhe",
      sliderLabel: "Archive time",
      status:
        "{{date}}: {{count}} sensors, {{min}}–{{max}} across the city.",
      baselineStatus_one:
        "{{date}}: Coloured by difference from {{name}} ({{count}} sensor).",
      baselineStatus_other:
        "{{date}}: Coloured by difference from {{name}} ({{count}} sensors).",
      legendCaption_one:
        "Each area is coloured by its nearest sensor in this {{hours}}-hour archive bucket ({{count}} sensor).",
      legendCaption_other:
        "Each area is coloured by its nearest sensor in this {{hours}}-hour archive bucket ({{count}} sensors).",
    },
  },
} as const;
