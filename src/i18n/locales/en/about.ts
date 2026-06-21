export default {
  heading: "About this explorer",
  intro:
    "A compact, read-only interface for Karlsruhe's public SensorCity data: current readings, locations, measurement history and raw ArcGIS queries.",
  whatItDoes: {
    heading: "What it does",
    body: "The app makes the public SensorCity FeatureServer easier to browse. It groups live sensors by category, places them on a map, exposes a searchable table and shows history charts where archive layers are available.",
    openMap: "Open map",
    openQuery: "Open query explorer",
  },
  design: {
    heading: "Design",
    body: "The interface follows KERN UX native CSS: semantic HTML, KERN typography, buttons, forms, tables, alerts and theme tokens. Use the controls below to switch language, or follow the system theme or a fixed light or dark design.",
    themeModes: "Theme modes",
    themeModesValue: "System, Light, Dark",
    preference: "Preference",
    preferenceValue: "Saved locally in this browser",
  },
  dataSource: {
    heading: "Data source",
    body: "Data comes from the City of Karlsruhe SensorCity ArcGIS FeatureServer. This explorer is unofficial and only sends read requests.",
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
    body: "The app does not require an account and does not write to the FeatureServer. Theme preference is stored in local browser storage. Sensor availability, update frequency and history depth depend on the public service.",
  },
  experiment: {
    heading: "Experiment",
    body: "A small experiment that blends the city's sensors with citizen stations from openSenseMap and sensor.community, to see how a denser temperature field would look.",
    link: "Try the combined live temperature map",
  },
} as const;
