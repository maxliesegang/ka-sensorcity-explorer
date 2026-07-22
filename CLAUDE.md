# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # tsc typecheck + production build to dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm test           # vitest run
```

There is no linter configured. `tsc` (strict, with `noUnusedLocals`/`noUnusedParameters`) plus the vitest suite are the correctness gates; `npm run build` runs `tsc` before bundling.

## Architecture

A static SPA reading directly from Karlsruhe's public, read-only ArcGIS REST FeatureServers (the main SensorCity service plus a separate LUBW/HVZ water-level archive), supplemented by DWD weather via Bright Sky — no API key, no backend. The data model is centralized so the UI derives from it.

The three-layer data flow is the key thing to understand:

1. **`src/api/arcgis.ts`** — generic, domain-agnostic FeatureServer client. Knows nothing about SensorCity. Two non-obvious behaviors to respect:
   - ArcGIS returns query errors as **HTTP 200 with an `{ error }` envelope**; `fetchJson` checks for this, so always go through it rather than calling `fetch` directly.
   - `ARCGIS_MAX_PAGE_SIZE` is the hard 2000-row service cap per page. `queryAll` paginates via `exceededTransferLimit` and **requires a stable `orderByFields`** (defaults to `objectid ASC`) for correct paging.
2. **`src/config/layers.ts`** — the entire data model: the 4 FeatureServer layers, plus `CATEGORIES` keyed by the live layer's `beschreibung` field, each mapping to its archive layer id and the measurements to display. The `beschreibung` values are upstream strings that have been renamed before (`Temperatur` → `Temperatur-Sensor`, July 2026) and mismatches fail *silently* — lookups and filters yield empty rather than throwing — so the weather key is exported as `TEMPERATURE_CATEGORY_KEY` rather than repeated as a literal. **This is the primary place to extend the app** (see README's "Extending"); map, legend, detail and query views all read from it. Only stable ids/structure live here — **display labels are NOT stored here**; they live in i18n `common` (see below) and resolve via the `categoryLabelKey` / `measurementLabelKey` / `layerLabelKey` helpers. Adding a category/measurement therefore also needs a matching label entry in both locale `common` files.
3. **`src/api/sensorcity.ts`** — domain access built on the generic client. Normalizes raw features into `Sensor` objects (`toSensor`), fetches per-device history from archive layers, and computes category counts via `outStatistics`. Note `fetchHistory` escapes the device id into a SQL `WHERE` clause.

### History sources (SensorCity vs external)

Not every category has a SensorCity archive layer — `Wasserpegel-Sensor`, for example, is published only on the live layer (no `archiveLayerId`). History fetching is therefore routed through a small provider abstraction rather than calling `fetchHistory` directly:

- **`src/api/history.ts`** — `resolveHistorySource(sensor, category, field)` returns the main SensorCity archive fetcher when the category has an `archiveLayerId`, otherwise falls back to a matching configured provider. This is what the detail view calls.
- **`src/config/historySources.ts`** — declarative map of `(category, field, deviceId) → fallback provider`. Adding a fallback history source for a sensor is a config entry here; adding a provider also requires one typed factory-registry entry in `history.ts` saying how to read it, so a missing implementation is a compile error. `resolveHistorySource` itself stays provider-agnostic.
- **`src/api/hvz.ts`** — paginated reader for the separate LUBW/HVZ water-level FeatureServer. Its `srid` station ids match the main live layer's water-gauge `device_id` values.
- **`src/api/brightsky.ts`** — DWD Rheinstetten (station 04177) hourly/current temperatures via Bright Sky. This is the "undisturbed" out-of-city baseline for the temperature field's deviation mode; it carefully distinguishes genuine observations from forecast-padded hours (`observed` flag).
- **`src/api/temperatureInsights.ts`** — cross-sensor temperature analytics built on the domain client: per-sensor stats, city spread series, and the geolocated frames the temperature field replays. Fetches every temperature sensor's archive with bounded concurrency.

The temperature field view (`/temperature`) draws live sensor readings as Voronoi/Thiessen regions (`src/utils/voronoi.ts`, via `d3-delaunay`), with temperature and baseline-relative ("deviation") display modes and a historical replay. Live temperature colours adapt to the current range; replay temperature colours use a fixed absolute scale for comparison across time. Baseline-station selection logic lives in `src/config/temperatureBaselines.ts`.

### Map layer (MapLibre GL)

All map views render with **MapLibre GL** over **OpenFreeMap** vector tiles (keyless, no signup — preserving the no-backend/no-API-key design; self-hostable if the public instance is ever unreliable). Three layers own it:

- **`src/hooks/useMapLibreMap.ts`** — create-once/teardown lifecycle. Exposes `{ containerRef, mapRef, isStyleReady }`; **`isStyleReady` is the contract**: sources/layers may only be added after the style loads, so every view's populate effect depends on it and re-runs when it flips. A light/dark theme swap calls `setStyle` (which discards custom layers) and cycles `isStyleReady` false→true, so the same effect re-adds everything. Basemap style per colour scheme lives in `src/config/basemap.ts` (`getBasemapStyleUrl`), resolved via `src/hooks/useResolvedColorScheme.ts`.
- **`src/utils/maplibreGeoJson.ts`** — idempotent GeoJSON helpers (`upsertGeoJsonSource`, `addLayerIfMissing`, feature builders). Geometry is GeoJSON-native **`[lon, lat]`** throughout — `voronoi.ts` emits that order, and feature `id` lives at the top level so `feature-state` can target it.
- **`src/utils/maplibreMarkers.ts`** / **`src/utils/maplibreTemperatureField.ts`** — presentation. Markers are GPU circle layers whose hover/active ring growth is a data-driven paint expression over `feature-state` (`createInteractiveCirclePaint`), not CSS or DOM. Popups use `buildSensorPopupHtml` (each feature carries its own pre-built popup HTML + tooltip text in its properties, so `bindCircleHoverState`/`bindFeaturePopups` are domain-agnostic). The temperature field is a `createTemperatureFieldController` owning three layers — cells (`fill`), markers (`circle`), value labels (`symbol`, native zoom-sizing + collision). The sensor and detail maps add 3D buildings through `addBuildingExtrusionLayer`.

Coordinate order is the classic footgun: it is `[lon, lat]` everywhere on the map side, the reverse of Leaflet's old `[lat, lon]`. See `MIGRATION.md` for the full migration record.

Views (`src/views/`) are one-per-route, wired in `src/App.tsx`: Overview (`/`), Sensors (`/sensors`, a searchable table/cards list), Map (`/map`), Temperature field (`/temperature`), Sensor detail (`/sensor/:objectId`), Query (`/query`), and About (`/about`, which also hosts the light/dark/system theme switch). Async data fetching goes through the abortable `useAsync` hook (`src/hooks/useAsync.ts`) paired with the `<Status>` component for loading/error/empty states.

**Current-readings panels (`src/components/readings/`)** — the detail view's "current readings" body is per sensor type, resolved by `getReadingsPanel(category)` (`panel.ts`); the view owns the section chrome and never branches on type. Dispatch is on what a category **declares**, not on its key: `depthProfiles` → `DepthReadings`, everything else → `GenericReadings`. Keep it that way — the profile tab is gated on the same shape, and a key-driven second axis can silently disagree with it (a new banded category would get the tab but flat cards, with nothing throwing). Presentation stays out of `config/layers.ts` (data, no React).

**i18n (`src/i18n/`)** — English/German via react-i18next. Each view has its own namespace (`overview`, `sensors`, `map`, …); shared chrome and domain labels live in `common`. Dictionaries are TS modules under `locales/<lang>/<namespace>.ts`, registered in `resources.ts`. Use `useTranslation("<ns>")` for view text and `useTranslation("common")` for domain labels. **Keep the EN and DE files structurally identical** (the same nested keys); `format.ts` reads the active language from the i18n singleton, so localized formatters re-run when callers subscribe via `useTranslation`.

## Naming rules

These are conventions the codebase already follows; keep new code consistent with them.

- **German stops at the API boundary.** The upstream feed is German (`beschreibung`, `measured_at`, `bodenfeuchte`, `pegel`). German is permitted *only* as opaque wire identifiers — attribute names, `Category.key` values, `Measurement.field` values — and inside `QueryView`'s raw `where`/`outFields` strings, where showing the literal request is the feature. `toSensor()` in `src/api/sensorcity.ts` is the boundary; nothing German crosses it. Domain types, hooks, components and views are English throughout.
  - Consequence: those German field names double as i18n keys (`measurements.luftfeuchte.label`). That is why upstream strings must each have exactly one home in `config/layers.ts` — see `TEMPERATURE_CATEGORY_KEY` / `TEMPERATURE_FIELD_KEY`. A rename upstream fails *silently* (filters yield empty rather than throwing).
- **archive / history / series** are three distinct levels: *archive* = the upstream layer (`archiveLayerId`), *history* = the fetched result (`fetchHistory`, `resolveHistorySource`), *series* = a chart-ready sequence (`spreadSeries`).
- **profile / band / grid** are the depth feature's three levels, mirroring the above: *profile* = the declared family of banded fields (`DepthProfile`, in `config/layers.ts`), *band* = one depth of it, *grid* = the resampled depth × time model a chart draws (`buildDepthProfileGrid`). A measurement a profile covers is *banded*; one no profile covers is *unbanded* (`getUnbandedMeasurements`) — the two partition a category's `measurements` exactly.
  - `DepthBand.band` is an ordinal rank (0 = shallowest), never a distance: the feed publishes stacked bands and no real depths (cm). Don't rename it to `depth`, which would imply one. `band` also stays clear of `index`, which the grid code uses for array positions.
  - A grid `cell` is a value **plus its provenance** (`DepthProfileCell.isInterpolated`): short reporting dropouts are interpolated so the heatmap stays comparable across them, longer outages stay `null`, and the bound between the two is `MAX_INTERPOLATED_COLUMNS`. Anything rendering cells must keep the distinction visible (the chart marks interpolated columns on a rail outside the plot; the readout and data table say it in words) — colouring filled-in cells as measured without saying so claims readings that were never taken.
  - `DepthProfileGrid` always contains absolute archive values. Display modes are derived by `buildDepthProfileView`: absolute passes the grid through, while development centres every band on its own measured median and keeps a symmetric delta range. Keep that transformation out of archive resampling so current values, provenance and future display modes continue to share one source of truth.
- **provider / source / kind**: *provider* is the identity of an upstream network (`HistoryProvider`, `TemperatureProvider` — `"sensorcity" | "hvz" | …`); *source* is a descriptor bundle that **has** a provider (`FallbackHistorySource`, `HistorySourceMetadata`); *kind* is reserved for discriminated-union tags (`legend.kind`).
- **reading vs observation**: a *reading* is any sensor value (the user-facing word — `currentReadings`, `LiveTemperatureReading`). *observation* is reserved for `brightsky.ts`, where it carries a real distinction: a genuine DWD measurement as opposed to a forecast-padded hour (`observed`). Don't collapse the two.
- **Verbs**: `query*` = raw ArcGIS `/query` transport (`api/arcgis.ts`) — a domain module wraps it under `fetch*` rather than re-exporting the name (`fetchLayerCount = queryCount`, `fetchArchiveFeatures`); `fetch*` = any domain-level network read; `get*` = pure in-memory lookup (`getCategory`, `getCategoryColor`, `getPrimaryMeasurement`, `getLiveTemperatureReadings`); `build*` = construct a derived model or scale from data (`buildAdaptiveTemperatureScale`, `buildDepthProfileGrid`); `to*` = coerce/normalize one value (`toSensor`, `toFiniteNumber`); `format*` = render for display (`formatValue`, `formatPrimaryReading`). Booleans are predicate-shaped (`is*` / `has*`), except where a name is fixed by something outside the app: wire fields (`exceededTransferLimit`, `returnGeometry`), library props (`NavLink`'s `end`), and `useAsync`'s `loading`.
  - Two deliberate exemptions to the verbs rule: `demo/api.ts` mirrors the surface it stubs, so its exports are named after their real counterparts (`history`, `count`, `layerFields`) rather than verb-prefixed; and pure math/array helpers (`mean`, `nearestPoint`, `observedOnly`) are not lookups and take no `get*`.

## Conventions & gotchas

- **HashRouter + relative `base: "./"`** (vite.config.ts) is deliberate — it keeps the build portable to any `https://<user>.github.io/<repo>/` GitHub Pages path. Don't switch to BrowserRouter or hardcode a base.
- Archive layers are **rolling windows**, so history is inherently limited to what the service currently retains — not a bug. The main archives retain weeks to months; the separate water-level archive currently retains only a few days.
- **The upstream service is not stable and breaks silently.** It has renamed a category (`Temperatur` → `Temperatur-Sensor`), deleted a layer and renumbered the rest, and migrated soil sensors onto depth-banded fields — all without notice, and none of it throws. When something renders empty, check the live feed before the code: `.../FeatureServer?f=json` for layers, and a `groupByFieldsForStatistics=beschreibung` count for category keys. Layers also declare fields they never populate (`pm10`, `pm25`, `windgeschwindigkeit`, UV are all 0 rows), and soil bands 6–7 return sentinels below absolute zero, so a field existing does **not** mean it has data.
- After changing `config/layers.ts`, re-run `npm run capture:demo` — the demo snapshot is keyed by layer id, category key and field name, and `src/demo/api.ts` returns `?? []` on a miss, so a stale snapshot blanks demo mode silently rather than erroring.
- Styling uses the **KERN UX** design system via `@kern-ux-annex/kern-react-kit`; MapLibre GL + OpenFreeMap vector tiles for the map. Both CSS bundles are imported in `main.tsx`.
- Deploy is automatic: pushing to `main` triggers `.github/workflows/deploy.yml` → GitHub Pages.
- `karlsruhe_sensorcity_api.md` is the upstream API reference; consult it before changing data access.
