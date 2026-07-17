export default {
  badge: "Stadtklima",
  heading: "Wie warm ist es gerade in Karlsruhe?",
  intro:
    "Warme und kühle Orte auf einen Blick. Jede Fläche nutzt den nächstgelegenen aktuellen Sensor; Rot ist im Vergleich wärmer, Blau kühler.",
  introLinkPrefix: "Lieber alle Sensoren sehen? ",
  introLink: "Vollständige Sensorkarte öffnen",
  canvasAria: "Temperaturkarte",
  mapAria: "Temperaturkarte von Karlsruhe",
  emptyToMap:
    "Derzeit sind keine aktuellen Temperaturmesswerte verfügbar.",
  status: {
    loading: "Sensoren werden geladen …",
    error: "Die Kartendaten konnten nicht geladen werden.",
    showingRange_one:
      "{{count}} kürzlich aktualisierter Sensor auf der Karte, misst {{min}}–{{max}} °C.",
    showingRange_other:
      "{{count}} kürzlich aktualisierte Sensoren auf der Karte, messen {{min}}–{{max}} °C.",
    showing_one: "{{count}} kürzlich aktualisierter Sensor auf der Karte.",
    showing_other: "{{count}} kürzlich aktualisierte Sensoren auf der Karte.",
  },
  legend: {
    cooler: "Kühler",
    warmer: "Wärmer",
    caption_one:
      "Jede Fläche nutzt den nächstgelegenen aktuellen Sensor ({{count}} insgesamt).",
    caption_other:
      "Jede Fläche nutzt den nächstgelegenen aktuellen Sensor ({{count}} insgesamt).",
  },
  popup: {
    viewDetails: "Details anzeigen",
    setReference: "Als Referenz festlegen",
  },
  combined: {
    badge: "Stadt + Community",
    heading: "Live-Temperaturen in ganz Karlsruhe",
    intro:
      "Live-Messwerte aus dem städtischen SensorCity-Netz und nahegelegenen Stationen von openSenseMap und sensor.community vergleichen.",
    introLinkPrefix: "Lieber nur das Stadtnetz? ",
    introLink: "Temperaturkarte nur mit Stadtsensoren öffnen",
    provider: {
      sensorcity: "SensorCity-Sensor",
      opensensemap: "openSenseMap-Community-Sensor",
      sensorcommunity: "sensor.community-Sensor",
    },
    viewOnProvider: "Auf {{provider}} ansehen",
    providerBreakdown:
      "{{sensorcity}} Stadt · {{opensensemap}} openSenseMap · {{sensorcommunity}} sensor.community",
    communityUnavailable:
      "Einige Community-Daten sind nicht verfügbar; geladene Messwerte werden angezeigt.",
    attribution:
      "Community-Messwerte über openSenseMap (opensensemap.org) und sensor.community, beide lizenziert unter CC BY-SA 4.0.",
  },
  baseline: {
    modeAbsolute: "Absolut",
    modeDeviation: "Abweichung zur Basislinie",
    modeLabel: "Farbmodus",
    selectLabel: "Basislinie",
    showLabels: "Werte auf Karte anzeigen",
    dwdOption: "Rheinstetten (DWD-Wetterstation)",
    averageOption: "Durchschnitt aller Sensoren",
    legendCaption:
      "Abweichung zu {{name}} — Rot ist wärmer, Blau ist kühler.",
    status_one:
      "Eingefärbt nach Abweichung zu {{name}} ({{count}} Sensor).",
    status_other:
      "Eingefärbt nach Abweichung zu {{name}} ({{count}} Sensoren).",
    asOf: "Basislinien-Messwert von {{time}} Uhr.",
    dwdReading: "DWD-Basislinie: {{value}} um {{time}} Uhr.",
    unavailableLive:
      "Keine Live-Basislinie verfügbar; absolute Temperaturen werden angezeigt.",
    unavailable:
      "Die gewählte Basislinie hat für diese Ansicht keinen Messwert; absolute Temperaturen werden angezeigt.",
  },
  insights: {
    heading: "Temperatur-Verlaufsanalyse",
    intro:
      "Karlsruhes Temperatursensoren im verfügbaren Archiv vergleichen.",
    selectedArchiveTime: "Gewählter Archivzeitpunkt",
    empty: "Derzeit ist kein Temperatur-Archiv verfügbar.",
    noCurrent:
      "Für einen Live-Vergleich sind mindestens zwei aktuelle Messwerte nötig.",
    live: {
      heading: "Live-Temperaturstatistik",
      intro:
        "Sensoren vergleichen, die in der letzten Stunde aktualisiert wurden.",
    },
    cta: {
      hint: "Dies lädt das gesamte verfügbare Archiv aller Temperatursensoren und kann einige Sekunden dauern.",
      button: "Verlaufsanalyse laden",
    },
    kpi: {
      spread: "Aktuelle Spanne",
      warmest: "Aktuell am wärmsten",
      coolest: "Aktuell am kühlsten",
      average: "Aktueller Stadtdurchschnitt",
      averageDetail_one: "Über {{count}} Sensor",
      averageDetail_other: "Über {{count}} Sensoren",
    },
    volatile: {
      label: "Schwankungsreichster Sensor",
      body:
        "{{name}} hat die größte historische Spanne: {{range}} ({{min}} bis {{max}}).",
    },
    tabs: {
      label: "Ansichten der Temperatur-Verlaufsanalyse",
      map: "Kartenverlauf",
      sensors: "Sensor-Ranking",
      spread: "Spannentrend",
    },
    table: {
      caption: "Temperaturvergleich nach Sensor, in Grad Celsius",
      unitContext: "Alle Werte sind in °C angegeben. Horizontal scrollen, um alle Spalten zu vergleichen.",
      scrollLabel: "Horizontal scrollbares Temperatur-Ranking pro Sensor",
      sensor: "Sensor",
      now: "Jetzt",
      min: "Min",
      max: "Max",
      average: "Ø",
      range: "Spanne",
      vsCity: "vs. Stadt-Ø",
      sortBy: "Nach {{column}} sortieren",
      note: "„vs. Stadt-Ø“ vergleicht jeden aktuellen Messwert mit dem aktuellen Stadtdurchschnitt ({{value}}). Positive Werte sind wärmer.",
    },
    spreadChart: {
      label: "Stadtweite Temperaturspanne im Zeitverlauf",
    },
    historyMap: {
      heading: "Historische Temperaturkarte",
      intro:
        "Die Temperaturkarte in {{hours}}-Stunden-Schritten aus dem Archiv abspielen.",
      empty:
        "Im Archiv sind keine historischen Kartenansichten verfügbar.",
      mapAria: "Historische Temperatur-Voronoi-Karte von Karlsruhe",
      sliderLabel: "Archivzeitpunkt",
      status:
        "{{date}}: {{count}} Sensoren, {{min}}–{{max}} in der Stadt.",
      baselineStatus_one:
        "{{date}}: Eingefärbt nach Abweichung zu {{name}} ({{count}} Sensor).",
      baselineStatus_other:
        "{{date}}: Eingefärbt nach Abweichung zu {{name}} ({{count}} Sensoren).",
      legendCaption_one:
        "Jede Fläche nutzt den nächstgelegenen Sensor in diesem {{hours}}-Stunden-Zeitraum ({{count}} Sensor).",
      legendCaption_other:
        "Jede Fläche nutzt den nächstgelegenen Sensor in diesem {{hours}}-Stunden-Zeitraum ({{count}} Sensoren).",
    },
  },
} as const;
