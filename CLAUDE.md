# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # tsc typecheck + production build to dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit (the only "test" — there is no test runner)
```

There is no linter or test framework configured. `tsc` (strict, with `noUnusedLocals`/`noUnusedParameters`) is the correctness gate; `npm run build` runs it before bundling.

## Architecture

A static SPA reading directly from Karlsruhe's public, read-only ArcGIS REST FeatureServer, supplemented by two other public, read-only APIs (DWD weather via Bright Sky, PEGELONLINE water gauges) — no API key, no backend. The data model is centralized so the UI derives from it.

The three-layer data flow is the key thing to understand:

1. **`src/api/arcgis.ts`** — generic, domain-agnostic FeatureServer client. Knows nothing about SensorCity. Two non-obvious behaviors to respect:
   - ArcGIS returns query errors as **HTTP 200 with an `{ error }` envelope**; `fetchJson` checks for this, so always go through it rather than calling `fetch` directly.
   - `MAX_RECORD_COUNT` is a hard 2000-row service cap per page. `queryAll` paginates via `exceededTransferLimit` and **requires a stable `orderByFields`** (defaults to `objectid ASC`) for correct paging.
2. **`src/config/layers.ts`** — the entire data model: the 5 FeatureServer layers, plus `CATEGORIES` keyed by the live layer's `beschreibung` field, each mapping to its archive layer id and the measurements to display. **This is the primary place to extend the app** (see README's "Extending"); map, legend, detail and query views all read from it. Only stable ids/structure live here — **display labels are NOT stored here**; they live in i18n `common` (see below) and resolve via the `categoryLabelKey` / `measurementLabelKey` / `layerLabelKey` helpers. Adding a category/measurement therefore also needs a matching label entry in both locale `common` files.
3. **`src/api/sensorcity.ts`** — domain access built on the generic client. Normalizes raw features into `Sensor` objects (`toSensor`), fetches per-device history from archive layers, and computes category counts via `outStatistics`. Note `fetchHistory` escapes the device id into a SQL `WHERE` clause.

### History sources (SensorCity vs external)

Not every category has a SensorCity archive layer — `Wasserpegel-Sensor`, for example, is published only on the live layer (no `archiveLayerId`). History fetching is therefore routed through a small provider abstraction rather than calling `fetchHistory` directly:

- **`src/api/history.ts`** — `resolveHistorySource(sensor, category, field)` returns the SensorCity archive fetcher when the category has an `archiveLayerId`, otherwise falls back to a matching external provider. This is what the detail view calls.
- **`src/config/historySources.ts`** — declarative map of `(category, field, deviceId) → external provider`. Adding an external history source for a sensor is a config entry here.
- **`src/api/pegelonline.ts`** — PEGELONLINE water-level client (plain `fetch`, different origin than ArcGIS).
- **`src/api/brightsky.ts`** — DWD Rheinstetten (station 04177) hourly/current temperatures via Bright Sky. This is the "undisturbed" out-of-city baseline for the temperature field's deviation mode; it carefully distinguishes genuine observations from forecast-padded hours (`observed` flag).
- **`src/api/temperatureInsights.ts`** — cross-sensor temperature analytics built on the domain client: per-sensor stats, city spread series, and the geolocated frames the temperature field replays. Fetches every temperature sensor's archive with bounded concurrency.

The temperature field view (`/temperature`) draws live sensor readings as Voronoi/Thiessen regions (`src/utils/voronoi.ts`, via `d3-delaunay`), with absolute and baseline-relative ("deviation") colour modes and a historical replay. Baseline-station selection logic lives in `src/config/temperatureBaselines.ts`.

Views (`src/views/`) are one-per-route, wired in `src/App.tsx`: Overview (`/`), Sensors (`/sensors`, a searchable table/cards list), Map (`/map`), Temperature field (`/temperature`), Sensor detail (`/sensor/:objectId`), Query (`/query`), and About (`/about`, which also hosts the light/dark/system theme switch). Async data fetching goes through the abortable `useAsync` hook (`src/hooks/useAsync.ts`) paired with the `<Status>` component for loading/error/empty states.

**i18n (`src/i18n/`)** — English/German via react-i18next. Each view has its own namespace (`overview`, `sensors`, `map`, …); shared chrome and domain labels live in `common`. Dictionaries are TS modules under `locales/<lang>/<namespace>.ts`, registered in `resources.ts`. Use `useTranslation("<ns>")` for view text and `useTranslation("common")` for domain labels. **Keep the EN and DE files structurally identical** (the same nested keys); `format.ts` reads the active language from the i18n singleton, so localized formatters re-run when callers subscribe via `useTranslation`.

## Conventions & gotchas

- **HashRouter + relative `base: "./"`** (vite.config.ts) is deliberate — it keeps the build portable to any `https://<user>.github.io/<repo>/` GitHub Pages path. Don't switch to BrowserRouter or hardcode a base.
- Archive layers are **rolling windows** (weeks to months), so history is inherently limited to what the service currently retains — not a bug.
- Styling uses the **KERN UX** design system via `@kern-ux-annex/kern-react-kit`; Leaflet + OpenStreetMap for the map. Both CSS bundles are imported in `main.tsx`.
- Deploy is automatic: pushing to `main` triggers `.github/workflows/deploy.yml` → GitHub Pages.
- `karlsruhe_sensorcity_api.md` is the upstream API reference; consult it before changing data access.
