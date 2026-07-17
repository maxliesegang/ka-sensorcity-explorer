export default {
  back: "Back",
  notFound: "Sensor not found.",
  heroSubtitle: "Latest published reading from SensorCity.",
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
  currentIntro: "Measurements and identifiers from the latest published record.",
  lastMeasuredAt: "Last measured {{date}}",
  facts: {
    lastMeasured: "Last measured",
    deviceId: "Device ID",
    coordinates: "Coordinates",
  },
  location: {
    heading: "Location",
    subtitle: "The map centres on this sensor and shows all located sensors.",
    noCoordinates:
      "No coordinates are available for this sensor. The map shows all located sensors instead.",
    focusSensor: "Focus sensor",
    fitAll: "Fit all",
    mapAria: "Map showing {{name}} and all located sensors",
    status: {
      loading: "Loading sensor locations...",
      error: "Other sensor locations could not be loaded.",
      showing: "Showing {{count}} located sensors.",
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
  noArchiveNote: "Only the latest reading is available; this sensor has no history archive.",
  noHistory: "No history available",
  profile: {
    heading: "Depth profile",
    intro:
      "Compare readings by depth and time. Level 0 is closest to the surface.",
    quantity: "Measurement",
    tableCaption:
      "Level 0 is closest to the surface; exact depths are not published.",
  },
  rawAttributes: "Raw data",
  rawIntro: "Original non-empty fields from the latest API record.",
  rawTableCaption: "Raw attributes for {{name}}",
  rawField: "Field",
  rawValue: "Value",
  analysis: {
    heading: "Historical analysis",
    kpi: {
      average: "Average",
      averageDetail: "from {{count}} readings",
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
      summary: "Hourly averages calculated from the available history.",
    },
  },
} as const;
