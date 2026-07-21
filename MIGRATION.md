# Leaflet → MapLibre GL migration

Tracking doc for moving the map layer from raster Leaflet to **MapLibre GL + OpenFreeMap**
(keyless vector basemap, 3D buildings, GPU-rendered Voronoi temperature field).

Status legend: ☐ todo · ◐ in progress · ☑ done

> **Status: complete.** All phases done — `npm run build` and `npm test` (148 tests, incl. new
> `voronoi.test.ts`) are green, `leaflet`/`@types/leaflet` removed, OpenFreeMap endpoints and the
> `Noto Sans Regular` glyphs / `building` source-layer verified reachable. Not yet visually QA'd in a
> browser (see "Remaining manual QA" at the bottom).

## Why

- Vector basemap: crisp labels at every zoom, continuous zoom, rotation/tilt.
- 3D buildings (`fill-extrusion`) give spatial context on a *city* sensor explorer.
- The Voronoi temperature field animates on the GPU instead of redrawing SVG DOM polygons.
- OpenFreeMap keeps the **keyless / no-backend / GitHub-Pages-portable** design pillar intact
  (public endpoint, no signup; self-hostable planet file as the escape hatch if the public
  instance ever becomes unreliable).

Cost: ~200 KB gzip (vs Leaflet ~40 KB), one-time rewrite of the hook + 2 utils + 5 consumers.

## Inventory — everything that touches Leaflet

| File | Role | Weight |
|---|---|---|
| `src/main.tsx` | imports `leaflet/dist/leaflet.css` | trivial |
| `src/hooks/useLeafletMap.ts` | create-once/teardown hook, named `LayerGroup`s | rewrite → `useMapLibreMap.ts` |
| `src/utils/leafletMarkers.ts` | popup HTML, tooltip/popup options, `circleMarker` interactions | rewrite → `maplibreMarkers.ts` |
| `src/utils/leafletTemperatureField.ts` | Voronoi polygons + cell labels + markers + fitBounds | rewrite → `maplibreTemperatureField.ts` |
| `src/utils/leafletLabelScale.ts` | zoom-responsive label sizing via CSS var | **delete** (symbol layers do this natively) |
| `src/utils/voronoi.ts` | pure geometry, outputs `[lat, lon]` rings | flip output to `[lon, lat]` + add test |
| `src/views/MapView.tsx` | sensor map | rewire map effect |
| `src/views/TemperatureFieldView.tsx` | live temp field | rewire map effect |
| `src/views/CombinedTemperatureFieldView.tsx` | combined community field | rewire map effect |
| `src/components/HistoricalTemperatureField.tsx` | replay | rewire map effect |
| `src/components/SensorLocationSection.tsx` | detail mini-map | rewire map effect |
| `src/styles.css` | `.leaflet-tooltip.*`, `.leaflet-popup-*`, marker/label styles | reclass to `.maplibregl-*` |
| `package.json` | `leaflet`, `@types/leaflet` | swap for `maplibre-gl` |

No tests touch the map layer today, so no test breakage. `voronoi.ts` gains a test to lock the coordinate flip.

## The five decisions that shape the port

1. **Coordinate order (#1 gotcha).** Leaflet `[lat, lon]`; MapLibre/GeoJSON `[lon, lat]`.
   `voronoi.ts` flips internal `[x=lon, y=lat]` → `[lat, lon]` for Leaflet today; switch it to emit
   GeoJSON-native `[lon, lat]`. Every `[point.lat, point.lon]` literal in the consumers flips too.
2. **Lifecycle — style `load` gating.** MapLibre can only add sources/layers after the style loads.
   The hook exposes an `isStyleReady` flag (set on `map.on('load')`); view effects depend on it.
3. **Rendering model — few sources, not many layers.**
   - Voronoi field: one `fill` GeoJSON source, per-cell colour via a paint expression, inserted
     *below* the basemap building layer so 3D buildings sit on top.
   - Markers: one `circle` layer; hover/active "ring grows" via `feature-state` + interpolate.
   - Cell labels: a `symbol` layer with `text-field` (native zoom sizing + collision) → deletes `leafletLabelScale.ts`.
   - Popups: use `buildSensorPopupHtml` with `new maplibregl.Popup().setHTML()`.
   - Hover tooltips: reimplement as a lightweight `Popup` on `mousemove` (no built-in equivalent).
4. **Dark mode.** Theme is `:root[data-kern-theme="light|dark"]`. OpenFreeMap: `liberty`/`bright` (light),
   `positron`/`dark` (dark). `map.setStyle()` wipes custom layers → re-add field/markers on `styledata`.
5. **Buildings vs field per view.** 3D extrusions ON for MapView + SensorLocationSection; OFF/flat on the
   three temperature views where the Voronoi surface is the message.

## Phases

- ☑ **Phase 0 — spike**: folded into Phase 1/3; OpenFreeMap keyless load + endpoints verified via curl.
- ☑ **Phase 1 — foundation**: `maplibre-gl` added; `useMapLibreMap()` →
  `{ containerRef, mapRef, isStyleReady }`; `maplibre-gl` CSS import; `maplibreGeoJson.ts`
  upsert + feature builders; `config/basemap.ts` +
  `useResolvedColorScheme.ts` light/dark style config.
- ☑ **Phase 2 — utils**: `maplibreMarkers.ts` (`buildSensorPopupHtml`;
  `bindCircleHoverState`/`bindFeaturePopups`/`bindInteractiveCircleLayer` over feature-state);
  `maplibreTemperatureField.ts` (`createTemperatureFieldController`: fill+circle+symbol);
  flipped `voronoi.ts` to `[lon, lat]` + added `voronoi.test.ts`;
  deleted `leafletLabelScale.ts`.
- ☑ **Phase 3 — consumers**: SensorLocationSection → MapView → CombinedTemperatureFieldView →
  TemperatureFieldView → HistoricalTemperatureField, all ported.
- ☑ **Phase 4 — CSS + cleanup**: popup/tooltip styles reclassed `.leaflet-*` → `.maplibregl-*`; dead
  `.sensor-marker` / `.temperature-field-label` / `.temperature-baseline-marker` rules removed;
  `addBuildingExtrusionLayer` on sensor + detail maps; `leaflet`/`@types/leaflet` removed (added explicit
  `@types/geojson`); `npm run build` + `npm test` green.
- ☑ **Phase 5 — docs**: CLAUDE.md map/naming references + README updated.
- ☑ **Phase 6 — consolidation**: the three temperature-field consumers were sharing the same
  post-port boilerplate verbatim. Two extractions removed it: `useTemperatureFieldController`
  owns the controller lifecycle — create once when `isStyleReady`, re-create after a theme
  swap, fit on data changes, teardown — leaving each view only its own render effect; and
  `TemperatureFieldIndicators.tsx` (`TemperatureFieldLegend` + `TemperatureBaselineStatus`) turns the shared
  `TemperatureLegendModel` / baseline state into the legend and status footnotes. Mirrors the
  existing `useTemperatureFieldModel` sharing so a fourth temperature view builds on all three.

## Remaining manual QA (browser)

Not verifiable headlessly — worth a visual pass before/after deploy:

- Tiles render at the GitHub-Pages `/<repo>/` path; light/dark theme swap re-adds field + markers.
- Voronoi field colours, per-cell value labels (toggle), and the "set as reference" popup action.
- Hover ring-grow + tooltip on markers; clicking a cell opens the popup.
- 3D buildings appear on the sensor + detail maps when tilted (drag the compass control).
- Replay slider on the historical temperature field animates smoothly.

## Codebase-specific risks

- `base: "./"` + HashRouter portability must survive (OpenFreeMap URLs are absolute HTTPS — no `base` interaction).
- OpenFreeMap is a free public service, one maintainer, no SLA — fine here; note the self-host fallback in code.
- `map.resize()` replaces every `invalidateSize()` (~5, tied to loading/filter transitions) or the map renders 0×0.
- Demo mode / `capture:demo` untouched (data layer, not map).

## Effort

~2–3 focused days. Hook + two utils are the real work; the five consumers are mechanical once utils exist.
Riskiest spots: `feature-state` hover, and setStyle-wipes-layers dark-mode handling.
