export default {
  badge: "Offene Live-Daten",
  heading: "Karlsruhe im Überblick",
  intro:
    "Aktuelle Messwerte aus dem SensorCity-Netz der Stadt: Wetter, Regen, Boden, Abfall und Wasser.",
  summaryAria: "Netzübersicht",
  kpi: {
    liveSensors: "Live-Sensoren",
    updatedRecently: "Letzte Stunde",
    onMap: "Auf der Karte",
  },
  categoriesHeading: "Sensorkategorien",
  currentReading: "Aktueller Messwert",
  latestValue: "Aktuellster Wert",
  filterSensors: "Sensoren filtern",
  exploreAria: "Erkunden",
  sensorCount_one: "{{count}} Sensor",
  sensorCount_other: "{{count}} Sensoren",
  updated: "Stand {{time}}",
  links: {
    map: { title: "Karte", hint: "Sensororte ansehen" },
    sensors: { title: "Sensoren", hint: "Suchen und filtern" },
    query: { title: "Abfrage", hint: "FeatureServer prüfen" },
  },
  newestReading: "Neuester Messwert",
  empty: "Es wurden keine Live-Sensoren gemeldet.",
} as const;
