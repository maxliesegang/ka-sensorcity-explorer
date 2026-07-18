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
    more: "More",
    moreAria: "More navigation options",
    secondary: "Data tools and information",
    routeChanged: "{{section}} page loaded",
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
    errorTitle: "Could not load data",
    empty: "No data available.",
  },
  footer: {
    builtWith: "Built with KERN UX. Data:",
    source: "City of Karlsruhe SensorCity",
    opensNewWindow: " (opens in a new window)",
    suffix: " — unofficial, read-only ArcGIS service.",
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
    pointsOver: "{{count}} readings · {{span}}",
    stepHint: "Arrow keys move between values",
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
    desc: "{{label}} line chart: {{count}} readings from {{min}} to {{max}}, {{from}} to {{to}}.",
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
      reading: "level {{band}}: {{value}}",
      span: "{{from}} to {{to}}",
      stepHint: "Arrow keys move through time",
      summary: "{{bands}} depth levels · {{count}} readings · {{span}}",
      mode: {
        label: "Profile view",
        absolute: "Values",
        development: "Change",
      },
      modeHint: {
        absolute: "Colour shows the reading at each depth level.",
        development: "Colour shows how far each depth level differs from its typical value.",
      },
      colorScale: "Colour scale",
      change24h: "Change in the last 24 hours",
      descAbsolute: "Heatmap of {{label}}: {{bands}} depth levels from {{count}} readings, values ranging from {{min}} to {{max}}, {{from}} to {{to}}. Colour shows the reading; deeper colour means a higher value.",
      descDevelopment: "Heatmap of change in {{label}}: {{bands}} depth levels from {{count}} readings, deviations from each level's median ranging from {{min}} to {{max}}, {{from}} to {{to}}. Colour shows the direction and size of change.",
    },
  },
  // Shared by everything that shows stacked depths — the profile heatmap's axis
  // and the current-readings depth table.
  depth: {
    label: "Depth level",
    band: "Level {{band}}",
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
      description: "Latest geolocated reading per sensor; no history.",
    },
    "2": {
      label: "Weather archive",
      description:
        "Rolling ~5-week weather history.",
    },
    "3": {
      label: "Rain gauge archive",
      description: "Rolling ~2-month rain-gauge history.",
    },
    "4": {
      label: "Soil sensor archive",
      description: "Rolling ~2-month soil moisture and temperature history.",
    },
  },
  fallback: {
    category: "Unknown",
  },
} as const;
