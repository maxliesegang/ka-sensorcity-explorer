export default {
  badge: "Stadtklima",
  heading: "Wie warm ist es gerade in Karlsruhe?",
  intro:
    "Eine Live-Temperaturkarte von Karlsruhe: Jede Fläche wird nach ihrem nächstgelegenen Sensor eingefärbt, sodass warme und kühle Stellen sofort auffallen. Die Farben vergleichen die Sensoren untereinander zum aktuellen Zeitpunkt — am rötesten ist es am wärmsten, am blausten am kühlsten.",
  introLinkPrefix: "Lieber alle Sensoren sehen? ",
  introLink: "Vollständige Sensorkarte öffnen",
  canvasAria: "Fläche der Temperaturkarte",
  mapAria: "Temperaturkarte von Karlsruhe",
  emptyToMap:
    "Derzeit keine kürzlich aktualisierten Temperatursensoren zum Anzeigen.",
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
      "Jede Fläche ist nach ihrem nächstgelegenen kürzlich aktualisierten Sensor eingefärbt ({{count}} insgesamt).",
    caption_other:
      "Jede Fläche ist nach ihrem nächstgelegenen kürzlich aktualisierten Sensor eingefärbt ({{count}} insgesamt).",
  },
  popup: {
    viewDetails: "Details anzeigen",
    setReference: "Als Referenz festlegen",
  },
  combined: {
    badge: "Stadt + Community",
    heading: "Live-Temperaturen in ganz Karlsruhe",
    intro:
      "Eine Live-Temperaturkarte, die das städtische SensorCity-Netz mit nahegelegenen Bürgerstationen von openSenseMap und sensor.community verbindet, damit das Feld überall dort gefüllt ist, wo gemessen wird.",
    introLinkPrefix: "Lieber nur das Stadtnetz? ",
    introLink: "Temperaturkarte nur mit Stadtsensoren öffnen",
    source: {
      sensorcity: "SensorCity-Sensor",
      opensensemap: "openSenseMap-Community-Sensor",
      sensorcommunity: "sensor.community-Sensor",
    },
    viewOnSource: "Auf {{source}} ansehen",
    sourceBreakdown:
      "{{city}} Stadt · {{opensensemap}} openSenseMap · {{sensorcommunity}} sensor.community",
    communityUnavailable:
      "Einige Community-Sensordaten sind derzeit nicht verfügbar; angezeigt wird, was geladen wurde.",
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
      "Wie sich die Temperatursensoren von Karlsruhe im gesamten vorgehaltenen Archiv vergleichen.",
    selectedArchiveTime: "Gewählter Archivzeitpunkt",
    empty: "Derzeit ist kein Temperatur-Archiv verfügbar.",
    noCurrent:
      "Für einen aktuellen Vergleich werden mindestens zwei kürzlich aktualisierte Temperaturwerte benötigt.",
    live: {
      heading: "Live-Temperaturstatistik",
      intro:
        "Ein direkter Vergleich der Temperatursensoren, die innerhalb der letzten Stunde aktualisiert wurden.",
    },
    cta: {
      hint: "Für diese Verlaufsanalyse wird der gesamte vorgehaltene Verlauf jedes Temperatursensors abgerufen, das kann einige Sekunden dauern.",
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
        "{{name}} schwankt am stärksten, mit einer historischen Spanne von {{range}} (von {{min}} bis {{max}}).",
    },
    tabs: {
      label: "Ansichten der Temperatur-Verlaufsanalyse",
      map: "Kartenverlauf",
      sensors: "Sensor-Ranking",
      spread: "Spannentrend",
    },
    table: {
      caption: "Temperaturvergleich pro Sensor",
      sensor: "Sensor",
      now: "Jetzt",
      min: "Min",
      max: "Max",
      average: "Ø",
      range: "Spanne",
      vsCity: "vs. Stadt-Ø",
      sortBy: "Nach {{column}} sortieren",
      note: "„vs. Stadt-Ø“ ist der aktuelle Messwert jedes Sensors minus dem aktuellen Stadtdurchschnitt ({{value}}); ein positiver Wert bedeutet wärmer als der Durchschnitt.",
    },
    spreadChart: {
      label: "Stadtweite Temperaturspanne im Zeitverlauf",
    },
    historyMap: {
      heading: "Historische Temperaturkarte",
      intro:
        "Die stadtweite Voronoi-Temperaturfläche in {{hours}}-Stunden-Schritten aus dem Archiv abspielen.",
      empty:
        "Für das vorgehaltene Temperaturarchiv sind keine historischen Kartenbilder verfügbar.",
      mapAria: "Historische Temperatur-Voronoi-Karte von Karlsruhe",
      sliderLabel: "Archivzeitpunkt",
      status:
        "{{date}}: {{count}} Sensoren, {{min}}–{{max}} in der Stadt.",
      baselineStatus_one:
        "{{date}}: Eingefärbt nach Abweichung zu {{name}} ({{count}} Sensor).",
      baselineStatus_other:
        "{{date}}: Eingefärbt nach Abweichung zu {{name}} ({{count}} Sensoren).",
      legendCaption_one:
        "Jede Fläche ist nach ihrem nächstgelegenen Sensor in diesem {{hours}}-Stunden-Archivfenster eingefärbt ({{count}} Sensor).",
      legendCaption_other:
        "Jede Fläche ist nach ihrem nächstgelegenen Sensor in diesem {{hours}}-Stunden-Archivfenster eingefärbt ({{count}} Sensoren).",
    },
  },
} as const;
