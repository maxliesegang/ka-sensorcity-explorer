export default {
  heading: "Karlsruhe at a glance",
  intro:
    "Weather, rain, soil and water readings from the city's SensorCity network.",
  summaryAria: "Network summary",
  kpi: {
    liveSensors: "Live sensors",
    updatedRecently: "Last hour",
    onMap: "On the map",
  },
  // The answers the network can give about the city, ahead of any statistic
  // about the network itself.
  conditions: {
    heading: "Right now in Karlsruhe",
    temperature: {
      label: "Air temperature",
      summary_one: "Typical of {{count}} sensor. Range {{min}} to {{max}}.",
      summary_other: "Typical of {{count}} sensors. Range {{min}} to {{max}}.",
      warmest: "Warmest right now:",
      link: "See warm and cool areas",
    },
    // Wet means a gauge's rain counter rose during the hour, not that it stands
    // above zero — see `utils/precipitation.ts`.
    rain: {
      label: "Rain in the last hour",
      dryValue: "Dry",
      wetValue_one: "{{count}} station",
      wetValue_other: "{{count}} stations",
      drySummary_one: "The one station that reported measured no rain.",
      drySummary_other: "None of the {{count}} reporting stations measured rain.",
      wetSummary_one: "{{count}} of {{total}} stations measured rain.",
      wetSummary_other: "{{count}} of {{total}} stations measured rain.",
      wettest: "Most at:",
    },
    // The gauges are not ranked: the rivers aren't comparable, their change is.
    water: {
      label: "River levels · 12 h",
      trend: {
        rising: "rising",
        falling: "falling",
        steady: "steady",
      },
      trendPeriod: "Change from {{from}} to {{to}}",
    },
  },
  // Locating happens in the browser; the position is used to sort the sensors
  // already loaded and is never sent anywhere.
  nearMe: {
    heading: "Sensors near you",
    privacy: "Your location stays in your browser — nothing is sent or stored.",
    button: "Find sensors near me",
    locating: "Locating…",
    denied: "Location access was declined. You can still browse the map or the sensor list.",
    unavailable: "Your location isn't available right now. Try the map instead.",
    none: "No geolocated sensors to compare against.",
  },
  categoriesHeading: "Sensor categories",
  currentReading: "Current reading",
  // A category card summarizes every reporting sensor rather than quoting one.
  typicalNow: "typical now",
  rangeAcross_one: "{{min}} to {{max}} across {{count}} sensor",
  rangeAcross_other: "{{min}} to {{max}} across {{count}} sensors",
  noCurrentReadings: "No current readings",
  latestFrom: "Latest: {{name}}",
  filterSensors: "Filter sensors",
  exploreAria: "Explore",
  sensorCount_one: "{{count}} sensor",
  sensorCount_other: "{{count}} sensors",
  updated: "Updated {{time}}",
  links: {
    map: { title: "Map", hint: "View sensor sites" },
    sensors: { title: "Sensors", hint: "Search and filter" },
    temperature: { title: "Temperature", hint: "Compare warm and cool areas" },
  },
  newestReading: "Newest reading",
  empty: "No live sensor data available.",
} as const;
