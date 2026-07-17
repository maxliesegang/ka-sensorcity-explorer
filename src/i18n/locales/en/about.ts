export default {
  heading: "About this explorer",
  intro:
    "Explore Karlsruhe's public SensorCity data: current readings, locations, history and advanced queries.",
  whatItDoes: {
    heading: "What it does",
    body: "Find sensors by category, compare them on the map or in a searchable list, and view measurement history where archive data is available.",
    openMap: "Open map",
    openQuery: "Open query explorer",
  },
  design: {
    heading: "Display settings",
    body: "Choose English or German and use your system theme, light mode or dark mode.",
    themeModes: "Theme modes",
    themeModesValue: "System, Light, Dark",
    preference: "Preference",
    preferenceValue: "Saved locally in this browser",
  },
  dataSource: {
    tableCaption: "SensorCity source layers and their purpose",
    heading: "Data source",
    body: "The City of Karlsruhe provides the data through its public SensorCity ArcGIS FeatureServer. This unofficial explorer only reads that service and cannot change its data.",
    liveLayer_one: "{{count}} live layer",
    liveLayer_other: "{{count}} live layers",
    archiveLayer_one: "{{count}} archive layer",
    archiveLayer_other: "{{count}} archive layers",
    readOnly: "Read-only",
    colId: "ID",
    colLayer: "Layer",
    colPurpose: "Purpose",
    colType: "Type",
    typeLive: "Live",
    typeArchive: "Archive",
  },
  privacy: {
    heading: "Privacy and limits",
    body: "No account is required. Language and theme preferences are saved in this browser. Sensor availability, update intervals and historical coverage depend on the public data service.",
  },
  experiment: {
    heading: "Experiment",
    body: "Combine city sensors with public stations from openSenseMap and sensor.community to explore a denser live temperature map.",
    link: "Try the combined live temperature map",
  },
} as const;
