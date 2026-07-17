export default {
  back: "Zurück",
  notFound: "Sensor nicht gefunden.",
  heroSubtitle: "Letzter bekannter Messwert aus dem öffentlichen SensorCity-Live-Layer.",
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
  currentIntro: "Live-Werte und Kennungen aus dem neuesten SensorCity-Datensatz.",
  lastMeasuredAt: "Zuletzt gemessen {{date}}",
  facts: {
    lastMeasured: "Zuletzt gemessen",
    deviceId: "Geräte-ID",
    coordinates: "Koordinaten",
  },
  location: {
    heading: "Standort",
    subtitle:
      "Alle Live-Sensoren werden angezeigt, dieser Sensor ist auf der Karte zentriert.",
    noCoordinates:
      "Dieser Sensor hat keine Koordinaten, daher zeigt die Karte alle verorteten Sensoren.",
    focusSensor: "Sensor fokussieren",
    fitAll: "Alle einpassen",
    mapAria: "Karte mit {{name}} und allen Live-Sensoren",
    status: {
      loading: "Alle Live-Sensoren werden geladen...",
      error:
        "Nur dieser Sensor wird angezeigt; alle Sensoren konnten nicht geladen werden.",
      showing: "{{count}} verortete Live-Sensoren werden angezeigt.",
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
  noArchiveNote: "Nur der Live-Messwert ist verfügbar (kein Verlaufsarchiv).",
  noHistory: "Kein Verlauf verfügbar",
  profile: {
    heading: "Tiefenprofil",
    intro:
      "Alle Tiefenstufen dieser Sonde über das vorgehaltene Archiv. Der Feed veröffentlicht gestufte Bänder statt tatsächlicher Tiefen; Stufe 0 ist die oberflächennächste.",
    quantity: "Größe",
    tableCaption:
      "Neuester Messwert je Tiefenstufe. Stufe 0 ist die oberflächennächste.",
  },
  rawAttributes: "Rohdaten",
  rawIntro: "Nicht leere Originalattribute aus der Live-API-Antwort.",
  rawField: "Feld",
  rawValue: "Wert",
  analysis: {
    heading: "Verlaufsanalyse",
    kpi: {
      average: "Durchschnitt",
      averageDetail: "über {{count}} Messwerte",
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
      summary:
        "Durchschnittswerte gruppiert nach Tagesstunde, aus dem vorgehaltenen Verlauf abgeleitet.",
    },
  },
} as const;
