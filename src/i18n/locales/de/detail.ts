export default {
  back: "Zurück",
  notFound: "Sensor nicht gefunden.",
  heroSubtitle: "Neuester von SensorCity veröffentlichter Messwert.",
  primaryValue: "Primärwert",
  tabs: {
    aria: "Sensor-Detailbereiche",
    current: "Aktuelle Messwerte",
    history: "Verlauf",
    profile: "Tiefenprofil",
    location: "Standort",
    raw: "Rohdaten",
  },
  currentReadings: "Aktuelle Messwerte",
  currentIntro: "Messwerte und Kennungen aus dem neuesten Datensatz.",
  lastMeasuredAt: "Zuletzt gemessen {{date}}",
  facts: {
    lastMeasured: "Zuletzt gemessen",
    deviceId: "Geräte-ID",
    coordinates: "Koordinaten",
  },
  location: {
    heading: "Standort",
    subtitle: "Die Karte zentriert diesen Sensor und zeigt alle verorteten Sensoren.",
    noCoordinates:
      "Für diesen Sensor fehlen Koordinaten. Die Karte zeigt stattdessen alle verorteten Sensoren.",
    focusSensor: "Sensor fokussieren",
    fitAll: "Alle einpassen",
    mapAria: "Karte mit {{name}} und allen verorteten Sensoren",
    status: {
      loading: "Sensorstandorte werden geladen...",
      error: "Weitere Sensorstandorte konnten nicht geladen werden.",
      showing: "{{count}} verortete Sensoren angezeigt.",
    },
    popup: {
      lastReading: "Letzter Messwert:",
      currentSensor: "Aktueller Sensor",
      viewDetails: "Details ansehen",
    },
  },
  history: "Verlauf",
  measurement: "Messgröße",
  historySource: "Quelle:",
  historySourceLabel: "Quelle: {{source}}",
  noArchiveNote: "Nur der neueste Messwert ist verfügbar; für diesen Sensor gibt es kein Verlaufsarchiv.",
  noHistory: "Kein Verlauf verfügbar",
  profile: {
    heading: "Tiefenprofil",
    intro:
      "Messwerte nach Tiefe und Zeit vergleichen. Stufe 0 liegt der Oberfläche am nächsten.",
    quantity: "Messgröße",
    tableCaption:
      "Stufe 0 liegt der Oberfläche am nächsten; genaue Tiefen werden nicht veröffentlicht.",
  },
  rawAttributes: "Rohdaten",
  rawIntro: "Nicht leere Felder aus dem neuesten API-Datensatz.",
  rawTableCaption: "Rohattribute für {{name}}",
  rawField: "Feld",
  rawValue: "Wert",
  analysis: {
    heading: "Verlaufsanalyse",
    kpi: {
      average: "Durchschnitt",
      averageDetail: "aus {{count}} Messwerten",
      min: "Minimum",
      max: "Maximum",
      range: "Spannweite",
      volatility: "Volatilität",
    },
    trend: {
      up: "Steigend um {{delta}} im jüngsten Zeitraum",
      down: "Fallend um {{delta}} im jüngsten Zeitraum",
      steady: "Stabil (±{{delta}})",
    },
    diurnal: {
      heading: "Durchschnitt nach Tagesstunde",
      aria: "Balkendiagramm des durchschnittlichen {{label}} nach Tagesstunde",
      caption:
        "Höchstwert gegen {{peak}}:00 Uhr ({{peakValue}}), Tiefstwert gegen {{trough}}:00 Uhr ({{troughValue}}).",
      summary: "Stündliche Mittelwerte aus dem Verlauf.",
    },
  },
} as const;
