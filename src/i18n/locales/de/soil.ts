export default {
  badge: "Boden",
  heading: "Was macht der Boden gerade?",
  intro:
    "Die Bodensensoren der Stadt, dargestellt als Flächen, die jeweils ihren nächstgelegenen Sensor übernehmen. Jeder Sensor misst in sechs übereinanderliegenden Tiefenstufen; die Stufe wählen Sie unten.",
  introCaveat:
    "Boden unterscheidet sich schon auf wenigen Metern deutlich — Schatten, Rasen, Asphalt. Eine Fläche zeigt also den Messwert ihres Sensors und nicht den Zustand des ganzen Blocks.",
  introLinkPrefix: "Lieber ein Sensor im Zeitverlauf? ",
  introLink: "Zur Sensorliste",
  notConfigured: "Es sind keine Bodengrößen mit Tiefenstufen konfiguriert.",
  canvasAria: "Bodenkarte",
  mapAria: "Bodenkarte von Karlsruhe",
  empty: "Keine aktuellen Bodenmesswerte.",
  emptyBand:
    "Kein Sensor meldet einen aktuellen Messwert bei {{band}}. Wählen Sie eine andere Tiefenstufe.",
  status: {
    loading: "Sensoren werden geladen…",
    error: "Die Kartendaten konnten nicht geladen werden.",
    showingRange_one: "{{count}} Sensor bei {{band}}, Werte {{min}}–{{max}}.",
    showingRange_other: "{{count}} Sensoren bei {{band}}, Werte {{min}}–{{max}}.",
    showing_one: "{{count}} Sensor bei {{band}}.",
    showing_other: "{{count}} Sensoren bei {{band}}.",
    deviation_one:
      "{{count}} Sensor bei {{band}}, eingefärbt nach Abweichung von {{name}}.",
    deviation_other:
      "{{count}} Sensoren bei {{band}}, eingefärbt nach Abweichung von {{name}}.",
  },
  controls: {
    quantityLabel: "Bodengröße",
    bandLabel: "Tiefenstufe",
    shallowest: "Oberflächennah",
    deepest: "Am tiefsten",
  },
  baseline: {
    displayModeLabel: "Kartenwerte",
    valueMode: "Messwerte",
    deviationMode: "Abweichung von Referenz",
    selectLabel: "Referenzsensor",
    showLabels: "Werte auf der Karte anzeigen",
    averageOption: "Mittelwert aller Sensoren",
    reading: "{{name}} bei {{band}}: {{value}}.",
    unavailable:
      "Die gewählte Referenz hat bei {{band}} keinen Messwert; es werden Werte gezeigt.",
  },
  legend: {
    temperature: {
      low: "Kühler",
      high: "Wärmer",
    },
    moisture: {
      low: "Trockener",
      high: "Feuchter",
    },
    caption_one:
      "Jede Fläche übernimmt ihren nächstgelegenen Sensor bei {{band}} ({{count}} insgesamt). Eine Farbskala umfasst alle Tiefenstufen, sodass die Stufen direkt vergleichbar sind.",
    caption_other:
      "Jede Fläche übernimmt ihren nächstgelegenen Sensor bei {{band}} ({{count}} insgesamt). Eine Farbskala umfasst alle Tiefenstufen, sodass die Stufen direkt vergleichbar sind.",
    deviationCaption:
      "Abweichung von {{name}}, verglichen bei {{band}} — auf beiden Seiten dieselbe Tiefe.",
  },
  bands: {
    heading: "Alle Tiefenstufen auf einmal",
    intro:
      "Die Karte färbt eine Stufe zur Zeit; hier ist die ganze Säule, wie sie gerade in der Stadt gemessen wird.",
    caption:
      "Stadtweite Spannweite je Tiefenstufe, oberflächennah zuerst. Die Werte sind stets die gemessenen, auch wenn die Karte Abweichungen zeigt.",
    median: "Median",
    range: "Spannweite",
    probes: "Sensoren",
    onMap: "(auf der Karte)",
  },
  popup: {
    viewDetails: "Details ansehen",
    setReference: "Als Referenz setzen",
  },
} as const;
