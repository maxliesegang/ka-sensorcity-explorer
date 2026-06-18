export default {
  badge: "Live open data",
  heading: "Karlsruhe at a glance",
  intro:
    "Current readings from the city's SensorCity network: weather, rain, soil, waste and water.",
  summaryAria: "Network summary",
  kpi: {
    liveSensors: "Live sensors",
    updatedRecently: "Last hour",
    onMap: "On the map",
  },
  categoriesHeading: "Sensor categories",
  currentReading: "Current reading",
  latestValue: "Latest value",
  filterSensors: "Filter sensors",
  exploreAria: "Explore",
  sensorCount_one: "{{count}} sensor",
  sensorCount_other: "{{count}} sensors",
  updated: "Updated {{time}}",
  links: {
    map: { title: "Map", hint: "View sensor sites" },
    sensors: { title: "Sensors", hint: "Search and filter" },
    query: { title: "Query", hint: "Inspect FeatureServer" },
  },
  newestReading: "Newest reading",
  empty: "No live sensors reported.",
} as const;
