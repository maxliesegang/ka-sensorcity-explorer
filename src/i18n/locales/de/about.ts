export default {
  heading: "Über diesen Explorer",
  intro:
    "Eine kompakte, schreibgeschützte Oberfläche für die öffentlichen SensorCity-Daten Karlsruhes: aktuelle Messwerte, Standorte, Messverläufe und rohe ArcGIS-Abfragen.",
  whatItDoes: {
    heading: "Was er macht",
    body: "Die App macht den öffentlichen SensorCity-FeatureServer leichter durchsuchbar. Sie gruppiert Live-Sensoren nach Kategorie, zeigt sie auf einer Karte, bietet eine durchsuchbare Tabelle und zeigt Verlaufsdiagramme, wo Archivschichten verfügbar sind.",
    openMap: "Karte öffnen",
    openQuery: "Abfrage-Explorer öffnen",
  },
  design: {
    heading: "Design",
    body: "Die Oberfläche folgt dem nativen KERN-UX-CSS: semantisches HTML, KERN-Typografie, Schaltflächen, Formulare, Tabellen, Hinweise und Design-Tokens. Über die Steuerung unten lässt sich die Sprache wechseln sowie dem Systemdesign folgen oder ein festes helles oder dunkles Design verwenden.",
    themeModes: "Designmodi",
    themeModesValue: "System, Hell, Dunkel",
    preference: "Einstellung",
    preferenceValue: "Lokal in diesem Browser gespeichert",
  },
  dataSource: {
    heading: "Datenquelle",
    body: "Die Daten stammen vom ArcGIS-FeatureServer der Stadt Karlsruhe (SensorCity). Dieser Explorer ist inoffiziell und sendet ausschließlich Leseanfragen.",
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
    body: "Die App erfordert kein Konto und schreibt nicht auf den FeatureServer. Die Design-Einstellung wird im lokalen Browser-Speicher abgelegt. Verfügbarkeit der Sensoren, Aktualisierungsfrequenz und Verlaufstiefe hängen vom öffentlichen Dienst ab.",
  },
  experiment: {
    heading: "Experiment",
    body: "Ein kleiner Versuch, der die städtischen Sensoren mit Bürgerstationen von openSenseMap und sensor.community verbindet, um zu sehen, wie ein dichteres Temperaturfeld aussehen würde.",
    link: "Kombinierte Live-Temperaturkarte ausprobieren",
  },
} as const;
