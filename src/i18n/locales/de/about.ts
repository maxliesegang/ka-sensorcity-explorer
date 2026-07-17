export default {
  heading: "Über diesen Explorer",
  intro:
    "Öffentliche SensorCity-Daten aus Karlsruhe erkunden: aktuelle Messwerte, Standorte, Verläufe und erweiterte Abfragen.",
  whatItDoes: {
    heading: "Was er macht",
    body: "Sensoren nach Kategorie finden, auf der Karte oder in einer durchsuchbaren Liste vergleichen und Messverläufe ansehen, sofern Archivdaten verfügbar sind.",
    openMap: "Karte öffnen",
    openQuery: "Abfrage-Explorer öffnen",
  },
  design: {
    heading: "Darstellung",
    body: "Deutsch oder Englisch wählen und das Systemdesign, den hellen oder den dunklen Modus verwenden.",
    themeModes: "Designmodi",
    themeModesValue: "System, Hell, Dunkel",
    preference: "Einstellung",
    preferenceValue: "Lokal in diesem Browser gespeichert",
  },
  dataSource: {
    tableCaption: "SensorCity-Datenebenen und ihr Zweck",
    heading: "Datenquelle",
    body: "Die Stadt Karlsruhe stellt die Daten über ihren öffentlichen SensorCity-ArcGIS-FeatureServer bereit. Dieser inoffizielle Explorer liest den Dienst nur und kann seine Daten nicht verändern.",
    liveLayer_one: "{{count}} Live-Schicht",
    liveLayer_other: "{{count}} Live-Schichten",
    archiveLayer_one: "{{count}} Archivschicht",
    archiveLayer_other: "{{count}} Archivschichten",
    readOnly: "Schreibgeschützt",
    colId: "ID",
    colLayer: "Schicht",
    colPurpose: "Zweck",
    colType: "Typ",
    typeLive: "Live",
    typeArchive: "Archiv",
  },
  privacy: {
    heading: "Datenschutz und Grenzen",
    body: "Es ist kein Konto erforderlich. Sprach- und Design-Einstellung werden in diesem Browser gespeichert. Sensorverfügbarkeit, Aktualisierungsintervalle und historische Abdeckung hängen vom öffentlichen Datendienst ab.",
  },
  experiment: {
    heading: "Experiment",
    body: "Städtische Sensoren mit öffentlichen Stationen von openSenseMap und sensor.community kombinieren und eine dichtere Live-Temperaturkarte erkunden.",
    link: "Kombinierte Live-Temperaturkarte ausprobieren",
  },
} as const;
