export default {
  badge: "City climate",
  heading: "How warm is Karlsruhe right now?",
  intro:
    "Warm and cool areas at a glance. Each area takes its nearest recent sensor; red is warmer, blue cooler than the rest.",
  introLinkPrefix: "Want every sensor instead? ",
  introLink: "Open the full sensor map",
  canvasAria: "Temperature map",
  mapAria: "Temperature field map of Karlsruhe",
  emptyToMap: "No recent temperature readings.",
  status: {
    loading: "Loading sensors…",
    error: "We couldn't load the map data.",
    showingRange_one:
      "{{count}} sensor on the map, reading {{min}}–{{max}} °C.",
    showingRange_other:
      "{{count}} sensors on the map, reading {{min}}–{{max}} °C.",
    showing_one: "{{count}} sensor on the map.",
    showing_other: "{{count}} sensors on the map.",
  },
  legend: {
    cooler: "Cooler",
    warmer: "Warmer",
    caption_one:
      "Each area takes its nearest recent sensor ({{count}} total).",
    caption_other:
      "Each area takes its nearest recent sensor ({{count}} total).",
  },
  popup: {
    viewDetails: "View details",
    setReference: "Set as reference",
  },
  combined: {
    badge: "City + community",
    heading: "Live temperatures across Karlsruhe",
    intro:
      "Compare live readings from the city's SensorCity network with nearby openSenseMap and sensor.community stations.",
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
      "Some community data didn't load; showing what we have.",
    attribution:
      "Community readings via openSenseMap (opensensemap.org) and sensor.community, both licensed CC BY-SA 4.0.",
  },
  baseline: {
    temperatureMode: "Temperature",
    deviationMode: "Difference from baseline",
    displayModeLabel: "Map values",
    selectLabel: "Baseline",
    showLabels: "Show values on map",
    dwdOption: "Rheinstetten (DWD weather station)",
    averageOption: "Average of all sensors",
    legendCaption:
      "Difference from {{name}} — red warmer, blue cooler.",
    status_one:
      "Coloured by difference from {{name}} ({{count}} sensor).",
    status_other:
      "Coloured by difference from {{name}} ({{count}} sensors).",
    asOf: "Baseline reading from {{time}}.",
    dwdReading: "DWD baseline: {{value}} at {{time}}.",
    unavailableLive:
      "No live baseline station; showing temperatures.",
    unavailable:
      "The chosen baseline has no reading here; showing temperatures.",
  },
  insights: {
    heading: "Temperature history analysis",
    intro:
      "Compare Karlsruhe's temperature sensors across the archive.",
    selectedArchiveTime: "Selected archive time",
    empty: "No temperature archive available.",
    noCurrent:
      "A live comparison needs at least two recent readings.",
    live: {
      heading: "Live temperature statistics",
      intro:
        "Compare sensors updated in the last hour.",
    },
    cta: {
      hint: "Loads the full archive for every temperature sensor; may take a few seconds.",
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
        "{{name}} has the widest range: {{range}} ({{min}} to {{max}}).",
    },
    tabs: {
      label: "Temperature history views",
      map: "Map replay",
      sensors: "Sensor ranking",
      spread: "Spread trend",
    },
    table: {
      caption: "Temperature comparison by sensor, in degrees Celsius",
      unitContext: "All values in °C. Scroll sideways to see every column.",
      scrollLabel: "Scrollable per-sensor temperature ranking",
      sensor: "Sensor",
      now: "Now",
      min: "Min",
      max: "Max",
      average: "Avg",
      range: "Range",
      vsCity: "vs city avg",
      sortBy: "Sort by {{column}}",
      note: "“vs city avg” compares each reading with the city average now ({{value}}). Positive is warmer.",
    },
    spreadChart: {
      label: "City-wide temperature spread over time",
    },
    historyMap: {
      heading: "Historical temperature map",
      intro:
        "Explore the archive on a {{interval}} timeline. Each sensor shows its latest earlier reading within the selected freshness limit.",
      empty:
        "No historical map views in the archive.",
      mapAria: "Historical temperature Voronoi map of Karlsruhe",
      sliderLabel: "Archive timeline",
      selectedTime: "Selected time",
      navigationStepLabel: "Jump by",
      maxReadingAgeLabel: "Include readings up to",
      earlier: "Earlier",
      later: "Later",
      play: "Play",
      pause: "Pause",
      loop: "Loop",
      latest: "Jump to latest",
      timelinePosition: "Time point {{current}} of {{total}}",
      minutes_one: "{{count}} minute",
      minutes_other: "{{count}} minutes",
      hours_one: "{{count}} hour",
      hours_other: "{{count}} hours",
      status:
        "{{date}}: {{count}} of {{total}} sensors, up to {{minutes}} min old · {{min}}–{{max}} across the city.",
      baselineStatus_one:
        "{{date}}: Coloured by difference from {{name}} · {{count}} of {{total}} sensors, up to {{minutes}} min old.",
      baselineStatus_other:
        "{{date}}: Coloured by difference from {{name}} · {{count}} of {{total}} sensors, up to {{minutes}} min old.",
      noReadingsForFrame:
        "{{date}}: No readings within {{minutes}} minutes ({{total}} sensors available in the archive).",
      lowCoverage:
        "Low coverage: {{count}} of {{total}} sensors. Choose a larger freshness limit for a denser map.",
      readingAgeCompact_one: "{{count}} min old",
      readingAgeCompact_other: "{{count}} min old",
      readingAge_one: "{{count}} minute before the selected time",
      readingAge_other: "{{count}} minutes before the selected time",
      legendCaption_one:
        "Each area takes its nearest available sensor; readings are at most {{minutes}} minutes old ({{count}} sensor).",
      legendCaption_other:
        "Each area takes its nearest available sensor; readings are at most {{minutes}} minutes old ({{count}} sensors).",
    },
  },
} as const;
