export default {
  heading: "Karlsruhe im Überblick",
  intro:
    "Messwerte zu Wetter, Regen, Boden und Wasser aus dem städtischen SensorCity-Netz.",
  summaryAria: "Netzübersicht",
  kpi: {
    liveSensors: "Live-Sensoren",
    updatedRecently: "Letzte Stunde",
    onMap: "Auf der Karte",
  },
  // The answers the network can give about the city, ahead of any statistic
  // about the network itself.
  conditions: {
    heading: "Gerade jetzt in Karlsruhe",
    temperature: {
      label: "Lufttemperatur",
      summary_one: "Typisch für {{count}} Sensor. Spanne {{min}} bis {{max}}.",
      summary_other: "Typisch für {{count}} Sensoren. Spanne {{min}} bis {{max}}.",
      warmest: "Am wärmsten gerade:",
      link: "Warme und kühle Orte ansehen",
    },
    // "Nass" heißt: der Regenzähler der Station ist in dieser Stunde gestiegen —
    // nicht, dass er über null steht (siehe `utils/precipitation.ts`).
    rain: {
      label: "Regen in der letzten Stunde",
      dryValue: "Trocken",
      wetValue_one: "{{count}} Station",
      wetValue_other: "{{count}} Stationen",
      drySummary_one: "Die eine meldende Station hat keinen Regen gemessen.",
      drySummary_other: "Keine der {{count}} meldenden Stationen hat Regen gemessen.",
      wetSummary_one: "{{count}} von {{total}} Stationen hat Regen gemessen.",
      wetSummary_other: "{{count}} von {{total}} Stationen haben Regen gemessen.",
      wettest: "Am meisten an:",
    },
    // Kein Ranking der Pegel: die Flüsse sind nicht vergleichbar, die
    // Veränderung schon.
    water: {
      label: "Pegel · 12 Std.",
      trend: {
        rising: "steigend",
        falling: "fallend",
        steady: "gleichbleibend",
      },
      trendPeriod: "Veränderung von {{from}} bis {{to}}",
    },
  },
  // Locating happens in the browser; the position is used to sort the sensors
  // already loaded and is never sent anywhere.
  nearMe: {
    heading: "Sensoren in Ihrer Nähe",
    privacy:
      "Ihr Standort bleibt im Browser — es wird nichts gesendet oder gespeichert.",
    button: "Sensoren in meiner Nähe finden",
    locating: "Standort wird ermittelt…",
    denied:
      "Der Zugriff auf den Standort wurde abgelehnt. Sie können weiterhin die Karte oder die Sensorliste nutzen.",
    unavailable:
      "Ihr Standort ist gerade nicht verfügbar. Nutzen Sie stattdessen die Karte.",
    none: "Keine verorteten Sensoren zum Vergleich vorhanden.",
  },
  categoriesHeading: "Sensorkategorien",
  currentReading: "Aktueller Messwert",
  // A category card summarizes every reporting sensor rather than quoting one.
  typicalNow: "typisch jetzt",
  rangeAcross_one: "{{min}} bis {{max}} über {{count}} Sensor",
  rangeAcross_other: "{{min}} bis {{max}} über {{count}} Sensoren",
  noCurrentReadings: "Keine aktuellen Messwerte",
  latestFrom: "Zuletzt: {{name}}",
  filterSensors: "Sensoren filtern",
  exploreAria: "Erkunden",
  sensorCount_one: "{{count}} Sensor",
  sensorCount_other: "{{count}} Sensoren",
  updated: "Stand {{time}}",
  links: {
    map: { title: "Karte", hint: "Sensororte ansehen" },
    sensors: { title: "Sensoren", hint: "Suchen und filtern" },
    temperature: { title: "Temperatur", hint: "Warme und kühle Orte vergleichen" },
  },
  newestReading: "Neuester Messwert",
  empty: "Keine Live-Sensordaten verfügbar.",
} as const;
