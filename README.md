# Karlsruhe SensorCity Explorer

A minimal, static web app for exploring the City of Karlsruhe **SensorCity**
sensor network. It reads directly from the public, read-only ArcGIS REST
FeatureServer behind the official dashboard — no API key, no backend.

Built with **Vite + React + TypeScript**, styled with the
[**KERN UX**](https://www.kern-ux.de/) design system via
`@kern-ux-annex/kern-react-kit`, and deployable as a
**GitHub Pages** static site.

## Features

- **Overview** — live sensor count, per-category breakdown, and the data model
  (all four FeatureServer layers).
- **Sensors** — a searchable, sortable, filterable list of every live sensor
  (table and card views), each linking to its detail page. The
  keyboard/screen-reader-friendly counterpart to the map.
- **Map** — all geolocated sensors on a Leaflet/OpenStreetMap map, filterable by
  category, each linking to its detail page.
- **Temperature** — a live temperature field for Karlsruhe drawn as
  nearest-sensor (Voronoi/Thiessen) regions, with absolute and baseline-relative
  ("deviation") colour modes, a choice of baseline station (including the DWD
  Rheinstetten reference and the sensor average), cross-sensor insights, and an
  optional historical replay.
- **Sensor detail** — current readings plus an interactive time-series chart of
  the chosen measurement, pulled from the matching history archive (or an
  external source such as PEGELONLINE where no archive exists).
- **Query explorer** — a small UI over the ArcGIS `/query` endpoint with a
  copyable request URL, for ad-hoc data exploration.
- **About** — project background, data sources, and a light/dark/system theme
  switch.

## Quick start

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

## Demo mode (offline snapshot)

The app can run from a frozen snapshot of every upstream API instead of the live
services — useful if SensorCity is down, for offline demos, or for stable
screenshots. Enable it with a run parameter:

```bash
VITE_DEMO=1 npm run dev        # whole session runs on the snapshot
```

or append `?demo` to the URL of any deployment (works on the static site too,
e.g. `https://<user>.github.io/<repo>/?demo#/map`).

The dataset lives at `public/demo-snapshot.json.gz` and is captured from the
real APIs by:

```bash
npm run capture:demo           # refresh the snapshot (live layer + full history + weather)
```

It captures the full retained archive (the complete per-sensor history, a raw
sample of each archive layer for the query explorer, plus PEGELONLINE and DWD
weather). That is >100 MB raw, so it is stored gzipped (~18 MB) and inflated in
the browser; set `DEMO_HISTORY_MAX_ROWS=N` when capturing for a smaller, recent
slice instead.

[`scripts/capture-demo.ts`](scripts/capture-demo.ts) reads the data model from
`src/config/` so it captures exactly what the app requests; the
[`src/demo/`](src/demo/) layer serves it back behind `isDemoMode()`. See
[the architecture notes](#architecture) for how the API modules delegate to it.

## Deployment (GitHub Pages)

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds and publishes to GitHub Pages. One-time setup:

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`.

The build uses a relative `base` and a hash router, so it works at any
`https://<user>.github.io/<repo>/` path without further configuration.

## Architecture

The code is organised so the data model lives in one place and the UI is
derived from it — adding a sensor category or measurement is a config change.

```
src/
├── api/
│   ├── arcgis.ts            Generic, typed FeatureServer client (query,
│   │                        pagination, statistics, count). No SensorCity logic.
│   ├── sensorcity.ts        Domain access: sensors, history, category counts.
│   ├── history.ts           Resolves a sensor+measurement to its history source
│   │                        (SensorCity archive, else an external provider).
│   ├── pegelonline.ts       PEGELONLINE water-level history.
│   ├── brightsky.ts         DWD Rheinstetten temperatures (deviation baseline).
│   └── temperatureInsights  Cross-sensor temperature stats + replay frames.
├── config/
│   ├── layers.ts            The data model: layers + categories + measurements.
│   │                        ← extend the app here.
│   ├── historySources.ts    External (non-ArcGIS) history sources per sensor.
│   └── temperatureBaselines Baseline-station options for deviation mode.
├── components/              Layout, Status (loading/error/empty), LineChart
│                            (SVG), temperature field/legend/insights, and UI.
├── hooks/                   useAsync (abortable async-state), useLeafletMap
│                            (create-once/teardown map lifecycle), + others.
├── i18n/                    react-i18next setup + per-namespace en/de dicts.
├── utils/                   format (locale-aware), voronoi (Thiessen cells),
│                            temperature scales/model, stats, Leaflet helpers.
├── views/                   One file per route: Overview, Sensors, Map,
│                            TemperatureField, SensorDetail, Query, About.
├── types.ts                Shared domain types.
└── App.tsx / main.tsx      Router + bootstrap (KERN + Leaflet CSS + i18n).
```

### Internationalization

The UI ships in **English and German** via [react-i18next](https://react.i18next.com/).
The language is detected from the browser (falling back to English), can be
switched in the header, and is persisted to `localStorage`. Strings live in
[`src/i18n/locales/<lang>/<namespace>.ts`](src/i18n/locales): shared chrome and
domain labels in `common`, plus one namespace per view. Domain display text
(category, measurement and layer labels) is **not** stored in
`config/layers.ts` — only stable ids are; the labels are resolved from `common`
via the `categoryLabelKey` / `measurementLabelKey` / `layerLabelKey` helpers.

### Extending

- **New measurement on an existing category** — add a `{ field, unit }` to that
  category's `measurements` in [`src/config/layers.ts`](src/config/layers.ts),
  and a `measurements.<field>.label` entry to the `common` dictionaries
  ([en](src/i18n/locales/en/common.ts) / [de](src/i18n/locales/de/common.ts)).
  It appears automatically in the detail view's cards and chart selector.
- **New category** — add a `Category` keyed by its live-layer `beschreibung`
  value, with its archive layer id and measurements, plus a
  `categories.<key>.label` entry in the `common` dictionaries. The map, legend
  and detail view pick it up. A category without an `archiveLayerId` (e.g. a
  gauge published only on the live layer) gets its history from an external
  source instead — see below.
- **New external history source** — for a measurement with no SensorCity
  archive, add an entry to
  [`src/config/historySources.ts`](src/config/historySources.ts) matching the
  sensor's category, field and `deviceId` to a provider (PEGELONLINE today). The
  detail view's [`resolveHistorySource`](src/api/history.ts) routes to it
  automatically.
- **New view/route** — add a file in `src/views/` and a `<Route>` in
  [`src/App.tsx`](src/App.tsx).

## Data source

The primary source is the City of Karlsruhe SensorCity ArcGIS FeatureServer —
see [`karlsruhe_sensorcity_api.md`](karlsruhe_sensorcity_api.md) for the
reference. Two further public, read-only APIs supplement it: **DWD** weather
(Rheinstetten station, via [Bright Sky](https://brightsky.dev/)) provides the
out-of-city temperature baseline, and **[PEGELONLINE](https://www.pegelonline.wsv.de/)**
provides water-level history where SensorCity has no archive.

The SensorCity archives are **rolling windows** (weeks to months), so history is
limited to what the service currently retains. This is an unofficial tool and
not affiliated with the City of Karlsruhe.
