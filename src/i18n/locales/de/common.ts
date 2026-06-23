// German translations for the shared chrome. Mirrors the structure of
// locales/en/common.ts exactly.

export default {
  app: {
    title: "Karlsruhe SensorCity Explorer",
    brand: "SensorCity Explorer",
    homeAria: "Karlsruhe SensorCity Startseite",
  },
  skipToMain: "Zum Hauptinhalt springen",
  nav: {
    primary: "Hauptnavigation",
    overview: "Übersicht",
    map: "Karte",
    temperature: "Temperatur",
    sensors: "Sensoren",
    query: "Abfrage",
    about: "Info",
  },
  titles: {
    sensorDetail: "Sensordetails",
  },
  theme: {
    label: "Design",
    system: "System",
    light: "Hell",
    dark: "Dunkel",
    optionTitle: "Design {{name}}",
  },
  language: {
    label: "Sprache",
    en: "English",
    de: "Deutsch",
  },
  status: {
    loading: "Wird geladen…",
    errorTitle: "Etwas ist schiefgelaufen",
    empty: "Keine Daten.",
  },
  footer: {
    builtWith: "Zum Erkunden gebaut mit KERN UX. Daten:",
    source: "Stadt Karlsruhe SensorCity",
    opensNewWindow: " (öffnet in einem neuen Fenster)",
    suffix: " (inoffiziell). Schreibgeschützter ArcGIS FeatureServer.",
  },
  time: {
    notAvailable: "—",
    justNow: "gerade eben",
    minAgo_one: "vor {{count}} Min.",
    minAgo_other: "vor {{count}} Min.",
    hoursAgo_one: "vor {{count}} Std.",
    hoursAgo_other: "vor {{count}} Std.",
    daysAgo_one: "vor {{count}} Tag",
    daysAgo_other: "vor {{count}} Tagen",
    readingTime: "Messung um {{time}} Uhr",
  },
  chart: {
    measurement: "Messwert",
    value: "Wert",
    pointsOver: "{{count}} Punkte über {{span}}",
    stepHint: "mit den Pfeiltasten durch die Werte blättern",
    data: "Diagrammdaten",
    time: "Zeit",
    valueHeader: "Wert",
    span: {
      underDay: "unter einem Tag",
      day_one: "{{count}} Tag",
      day_other: "{{count}} Tage",
      week_one: "{{count}} Woche",
      week_other: "{{count}} Wochen",
    },
    desc: "Liniendiagramm von {{label}} über {{span}}: {{count}} Punkte von {{min}} bis {{max}}, {{from}} bis {{to}}.",
    pointAt: "{{time}}: {{value}}",
  },
  categories: {
    Temperatur: { label: "Wetter / Luft" },
    "TSK-Container": { label: "Abfallbehälter" },
    Regenschreiber: { label: "Regenschreiber" },
    "Boden-Sensor": { label: "Bodensensor" },
    "Wasserpegel-Sensor": { label: "Wasserstand" },
  },
  measurements: {
    temp: { label: "Temperatur" },
    luftfeuchte: { label: "Luftfeuchtigkeit" },
    press: { label: "Luftdruck" },
    pm10: { label: "PM10" },
    pm25: { label: "PM2,5" },
    sonnenstrahlung: { label: "Sonnenstrahlung" },
    niederschlag: { label: "Niederschlag" },
    windgeschwindigkeit: { label: "Windgeschwindigkeit" },
    fillinglvl_percent: { label: "Füllstand" },
    clicks: { label: "Impulse" },
    bodenfeuchte: { label: "Bodenfeuchte" },
    bodentemperatur: { label: "Bodentemperatur" },
    pegel: { label: "Wasserstand" },
  },
  layers: {
    "1": {
      label: "Live-Messwerte",
      description: "Aktuellster Wert pro Sensor (keine Historie). Verortete Punkte.",
    },
    "2": {
      label: "Wetterarchiv",
      description:
        "Temperatur, Luftfeuchtigkeit, Luftdruck, Feinstaub, UV, Strahlung, Niederschlag und Wind. ~5 Wochen rollierend.",
    },
    "3": {
      label: "Abfallbehälter-Archiv",
      description:
        "Füllstände und Behältertemperatur von Abfallbehältern. ~5 Monate rollierend.",
    },
    "4": {
      label: "Regenschreiber-Archiv",
      description: "Impulse von Wippen-Regenschreibern. ~2 Monate rollierend.",
    },
    "5": {
      label: "Bodensensor-Archiv",
      description: "Bodenfeuchte und -temperatur. ~2 Monate rollierend.",
    },
  },
  fallback: {
    category: "Unbekannt",
  },
} as const;
