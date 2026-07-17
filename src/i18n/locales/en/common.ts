// Shared chrome: app title, navigation, theme/language switches, status
// messages, footer, relative-time words, and the domain labels (sensor
// categories, measurements and FeatureServer layers) keyed by their stable ids.

export default {
  app: {
    title: "Karlsruhe SensorCity Explorer",
    brand: "SensorCity Explorer",
    homeAria: "Karlsruhe SensorCity home",
  },
  skipToMain: "Skip to main content",
  nav: {
    primary: "Primary",
    overview: "Overview",
    map: "Map",
    temperature: "Temperature",
    sensors: "Sensors",
    query: "Query",
    about: "About",
  },
  titles: {
    sensorDetail: "Sensor detail",
  },
  theme: {
    label: "Theme",
    system: "System",
    light: "Light",
    dark: "Dark",
    optionTitle: "{{name}} theme",
  },
  language: {
    label: "Language",
    en: "English",
    de: "Deutsch",
  },
  status: {
    loading: "Loading…",
    errorTitle: "Something went wrong",
    empty: "No data.",
  },
  footer: {
    builtWith: "Built for exploration with KERN UX. Data:",
    source: "City of Karlsruhe SensorCity",
    opensNewWindow: " (opens in a new window)",
    suffix: " (unofficial). Read-only ArcGIS FeatureServer.",
  },
  time: {
    notAvailable: "—",
    justNow: "just now",
    minAgo_one: "{{count}} min ago",
    minAgo_other: "{{count}} min ago",
    hoursAgo_one: "{{count}} h ago",
    hoursAgo_other: "{{count}} h ago",
    daysAgo_one: "{{count}} d ago",
    daysAgo_other: "{{count}} d ago",
    readingTime: "Reading at {{time}}",
  },
  chart: {
    measurement: "measurement",
    value: "value",
    pointsOver: "{{count}} points over {{span}}",
    stepHint: "use arrow keys to step through values",
    data: "Chart data",
    time: "Time",
    valueHeader: "Value",
    span: {
      underDay: "under a day",
      day_one: "{{count}} day",
      day_other: "{{count}} days",
      week_one: "{{count}} week",
      week_other: "{{count}} weeks",
    },
    desc: "Line chart of {{label}} over {{span}}: {{count}} points ranging from {{min}} to {{max}}, {{from}} to {{to}}.",
    pointAt: "{{time}}: {{value}}",
    profile: {
      // Doubles as the legend label for neutral cells, so it is capitalized;
      // it also lands in the `reading` value slot ("depth 0: No reading").
      noReading: "No reading",
      // Legend label for the rail under the plot, so it is capitalized.
      interpolated: "Interpolated across missing readings",
      // Marks a filled-in value wherever cells are read one at a time (the
      // column readout, the data table) and the legend is too far away to help.
      interpolatedValue: "{{value}} (interpolated)",
      reading: "depth {{band}}: {{value}}",
      span: "{{from}} to {{to}}",
      stepHint: "use arrow keys to step through time",
      summary: "{{bands}} depth bands · {{count}} readings · {{span}}",
      mode: {
        label: "Profile display",
        absolute: "Absolute values",
        development: "Change",
      },
      change24h: "Change over the latest 24 hours",
      medianNote: "Compared with each depth's median",
      descAbsolute: "Heatmap of {{label}}: {{bands}} bands from {{count}} readings, values ranging from {{min}} to {{max}}, {{from}} to {{to}}. Colour shows the reading; deeper colour means a higher value.",
      descDevelopment: "Heatmap of change in {{label}}: {{bands}} bands from {{count}} readings, deviations from each depth's median ranging from {{min}} to {{max}}, {{from}} to {{to}}. Colour shows the direction and size of change.",
    },
  },
  // Shared by everything that shows stacked depths — the profile heatmap's axis
  // and the current-readings depth table.
  depth: {
    label: "Depth",
    band: "Depth {{band}}",
  },
  // Names the quantity only; the surrounding view already says "by depth".
  depthProfiles: {
    soil_moisture: { label: "Soil moisture" },
    soil_temperature: { label: "Soil temperature" },
  },
  categories: {
    "Temperatur-Sensor": { label: "Weather / air" },
    Regenschreiber: { label: "Rain gauge" },
    "Boden-Sensor": { label: "Soil sensor" },
    "Wasserpegel-Sensor": { label: "Water level" },
  },
  measurements: {
    temp: { label: "Temperature" },
    luftfeuchte: { label: "Humidity" },
    press: { label: "Pressure" },
    sonnenstrahlung: { label: "Solar radiation" },
    niederschlag: { label: "Precipitation" },
    clicks: { label: "Clicks" },
    soil_moisture_at_depth_01: { label: "Soil moisture (depth 0)" },
    soil_moisture_at_depth_11: { label: "Soil moisture (depth 1)" },
    soil_moisture_at_depth_21: { label: "Soil moisture (depth 2)" },
    soil_moisture_at_depth_31: { label: "Soil moisture (depth 3)" },
    soil_moisture_at_depth_41: { label: "Soil moisture (depth 4)" },
    soil_moisture_at_depth_51: { label: "Soil moisture (depth 5)" },
    soil_temperature_at_depth_01: { label: "Soil temperature (depth 0)" },
    soil_temperature_at_depth_11: { label: "Soil temperature (depth 1)" },
    soil_temperature_at_depth_21: { label: "Soil temperature (depth 2)" },
    soil_temperature_at_depth_31: { label: "Soil temperature (depth 3)" },
    soil_temperature_at_depth_41: { label: "Soil temperature (depth 4)" },
    soil_temperature_at_depth_51: { label: "Soil temperature (depth 5)" },
    pegel: { label: "Water level" },
  },
  layers: {
    "1": {
      label: "Live readings",
      description: "Latest value per sensor (no history). Geolocated points.",
    },
    "2": {
      label: "Weather archive",
      description:
        "Temperature, humidity, pressure, particulate matter, UV, radiation, precipitation and wind. ~5 weeks rolling.",
    },
    "3": {
      label: "Rain gauge archive",
      description: "Tipping-bucket rain gauge clicks. ~2 months rolling.",
    },
    "4": {
      label: "Soil sensor archive",
      description: "Soil moisture and temperature. ~2 months rolling.",
    },
  },
  fallback: {
    category: "Unknown",
  },
} as const;
