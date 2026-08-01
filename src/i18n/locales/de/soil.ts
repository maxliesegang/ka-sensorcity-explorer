export default {
  heading: "Was macht der Boden gerade?",
  intro:
    "Die Bodensensoren der Stadt an ihren Standorten. Jeder misst in sechs Tiefenstufen; die Stufe wählen Sie unten.",
  introCaveat:
    "Boden unterscheidet sich schon auf wenigen Metern deutlich — Schatten, Rasen, Asphalt. Ein Sensor zeigt also seinen Standort, nicht den Zustand des ganzen Blocks.",
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
    historyLoading: "Historie wird geladen; solange werden Messwerte gezeigt.",
    historyLoadingProgress_one:
      "Historie für {{completed}} von {{count}} Sensor wird geladen; solange werden Messwerte gezeigt.",
    historyLoadingProgress_other:
      "Historie für {{completed}} von {{count}} Sensoren wird geladen; solange werden Messwerte gezeigt.",
    historyError: "Der Vergleich ist gerade nicht verfügbar; Messwerte werden gezeigt.",
    comparison_one: "{{comparedCount}} von {{count}} Sensor verglichen · {{band}}.",
    comparison_other: "{{comparedCount}} von {{count}} Sensoren verglichen · {{band}}.",
  },
  controls: {
    quantityLabel: "Bodengröße",
    bandLabel: "Tiefenstufe",
    shallowest: "Oberflächennah",
    deepest: "Am tiefsten",
  },
  comparisonCallout: {
    heading: "Ist dieser Ort gerade ungewöhnlich?",
    hint:
      "Vergleichen Sie jeden Sensor mit seinen eigenen letzten 30 Tagen und erkennen Sie ungewöhnlich trockene, feuchte, kühle oder warme Böden.",
    button: "Mit Historie vergleichen",
  },
  baseline: {
    displayModeLabel: "Kartenwerte",
    valueMode: "Messwerte",
    deviationMode: "Im Vergleich",
    showLabels: "Werte auf der Karte anzeigen",
    showCells: "Flächen einfärben",
  },
  reference: {
    heading: "So funktioniert der Vergleich",
    status: {
      lower: { moisture: "Trockener", temperature: "Kühler" },
      normal: { moisture: "Normal", temperature: "Normal" },
      higher: { moisture: "Feuchter", temperature: "Wärmer" },
      unavailable: { moisture: "Keine Historie", temperature: "Keine Historie" },
    },
    noData: "Keine Historie",
    caption:
      "Aktueller Wert bei {{band}} im Vergleich zu den letzten {{days}} Tagen. Normal ist die mittlere Hälfte der Werte.",
    partial_one: "Die Historie von {{count}} Sensor fehlt.",
    partial_other: "Die Historie von {{count}} Sensoren fehlt.",
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
      "Jeder Sensor bei {{band}} ({{count}} insgesamt). Eine Farbskala umfasst alle Tiefenstufen, sodass die Stufen direkt vergleichbar sind.",
    caption_other:
      "Jeder Sensor bei {{band}} ({{count}} insgesamt). Eine Farbskala umfasst alle Tiefenstufen, sodass die Stufen direkt vergleichbar sind.",
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
    reference: "{{status}} · üblich {{usualMin}}–{{usualMax}} · Ø {{mean}}",
    noReference: "Noch nicht genug Historie.",
  },
} as const;
