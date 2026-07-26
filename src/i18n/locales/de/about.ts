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
    body: "Deutsch oder Englisch wählen und dem Systemdesign folgen oder Hell bzw. Dunkel festlegen.",
    themeModes: "Designmodi",
    themeModesValue: "System, Hell, Dunkel",
    preference: "Einstellung",
    preferenceValue: "Lokal in diesem Browser gespeichert",
  },
  dataSource: {
    tableCaption: "SensorCity-Datenebenen und ihr Zweck",
    heading: "Datenquelle",
    body: "Die Stadt Karlsruhe stellt die Daten über ihren öffentlichen SensorCity-ArcGIS-FeatureServer bereit. Dieser inoffizielle Explorer liest den Dienst nur aus und kann keine Daten verändern.",
    liveLayer_one: "{{count}} Live-Ebene",
    liveLayer_other: "{{count}} Live-Ebenen",
    archiveLayer_one: "{{count}} Archiv-Ebene",
    archiveLayer_other: "{{count}} Archiv-Ebenen",
    readOnly: "Schreibgeschützt",
    colId: "ID",
    colLayer: "Ebene",
    colPurpose: "Zweck",
    colType: "Typ",
    typeLive: "Live",
    typeArchive: "Archiv",
  },
  privacy: {
    heading: "Datenschutz und Einschränkungen",
    body: "Es ist kein Konto erforderlich. Sprach- und Designeinstellungen werden in diesem Browser gespeichert. Sensorverfügbarkeit, Aktualisierungsintervalle und historische Abdeckung hängen vom öffentlichen Datendienst ab.",
  },
  experiment: {
    heading: "Experiment",
    body: "Städtische Sensoren mit öffentlichen Stationen von openSenseMap und sensor.community kombinieren und eine dichtere Live-Temperaturkarte erkunden.",
    link: "Kombinierte Live-Temperaturkarte ausprobieren",
  },
} as const;
