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
  },
  categories: {
    Temperatur: { label: "Weather / air" },
    "TSK-Container": { label: "Waste container" },
    Regenschreiber: { label: "Rain gauge" },
    "Boden-Sensor": { label: "Soil sensor" },
    "Wasserpegel-Sensor": { label: "Water level" },
  },
  measurements: {
    temp: { label: "Temperature" },
    luftfeuchte: { label: "Humidity" },
    press: { label: "Pressure" },
    pm10: { label: "PM10" },
    pm25: { label: "PM2.5" },
    sonnenstrahlung: { label: "Solar radiation" },
    niederschlag: { label: "Precipitation" },
    windgeschwindigkeit: { label: "Wind speed" },
    fillinglvl_percent: { label: "Fill level" },
    clicks: { label: "Clicks" },
    bodenfeuchte: { label: "Soil moisture" },
    bodentemperatur: { label: "Soil temperature" },
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
      label: "Waste container archive",
      description:
        "Waste-container fill levels and container temperature. ~5 months rolling.",
    },
    "4": {
      label: "Rain gauge archive",
      description: "Tipping-bucket rain gauge clicks. ~2 months rolling.",
    },
    "5": {
      label: "Soil sensor archive",
      description: "Soil moisture and temperature. ~2 months rolling.",
    },
  },
  fallback: {
    category: "Unknown",
  },
} as const;
