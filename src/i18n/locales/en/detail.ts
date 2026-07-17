export default {
  back: "Back",
  notFound: "Sensor not found.",
  heroSubtitle: "Latest known reading from the public SensorCity live layer.",
  primaryValue: "Primary value",
  tabs: {
    aria: "Sensor detail sections",
    current: "Current readings",
    history: "History",
    profile: "Depth profile",
    location: "Location",
    raw: "Raw data",
  },
  currentReadings: "Current readings",
  currentIntro: "Live values and identifiers from the latest SensorCity record.",
  lastMeasuredAt: "Last measured {{date}}",
  facts: {
    lastMeasured: "Last measured",
    deviceId: "Device ID",
    coordinates: "Coordinates",
  },
  location: {
    heading: "Location",
    subtitle: "All live sensors are shown, with this sensor centered on the map.",
    noCoordinates:
      "This sensor has no coordinates, so the map falls back to all mapped sensors.",
    focusSensor: "Focus sensor",
    fitAll: "Fit all",
    mapAria: "Map showing {{name}} and all live sensors",
    status: {
      loading: "Loading all live sensors...",
      error: "Showing this sensor only; all sensors could not be loaded.",
      showing: "Showing {{count}} mapped live sensors.",
    },
    popup: {
      lastReading: "Last reading:",
      currentSensor: "Current sensor",
      viewDetails: "View details",
    },
  },
  history: "History",
  measurement: "Measurement",
  historySource: "Source:",
  historySourceLabel: "Source: {{source}}",
  noArchiveNote: "Only the live reading is available (no history archive).",
  noHistory: "No history available",
  profile: {
    heading: "Depth profile",
    intro:
      "Colour shows how readings at each depth level change over time. Level 0 is closest to the surface.",
    quantity: "Measurement",
    tableCaption:
      "Level 0 is closest to the surface; exact depths are not published.",
  },
  rawAttributes: "Raw data",
  rawIntro: "Original non-empty attributes from the live API response.",
  rawField: "Field",
  rawValue: "Value",
  analysis: {
    heading: "Historical analysis",
    kpi: {
      average: "Average",
      averageDetail: "over {{count}} readings",
      min: "Minimum",
      max: "Maximum",
      range: "Range",
      volatility: "Volatility",
    },
    trend: {
      up: "Trending up by {{delta}} over the recent window",
      down: "Trending down by {{delta}} over the recent window",
      steady: "Holding steady (±{{delta}})",
    },
    diurnal: {
      heading: "Average by hour of day",
      aria: "Bar chart of average {{label}} by hour of day",
      caption:
        "Peaks around {{peak}}:00 ({{peakValue}}), lowest around {{trough}}:00 ({{troughValue}}).",
      summary:
        "Average values grouped by hour of day, derived from the retained history.",
    },
  },
} as const;
