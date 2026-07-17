# Karlsruhe SensorCity — API Reference

Unofficial documentation for reading sensor data from the City of Karlsruhe
"SensorCity" dashboard. The dashboard is an Esri Experience Builder app backed
by a public **ArcGIS REST FeatureServer**. No authentication is required.

**Base URL**

```
https://geoportal.karlsruhe.de/ags04/rest/services/Hosted/Sensordaten_NodeRED/FeatureServer
```

Append `?f=json` to any URL to see its metadata.

---

## Layers

| ID | Name | Records* | History range* | Description |
|----|------|---------:|----------------|-------------|
| 1 | `Sensordaten_Update` | live | current only | Latest value per sensor (no history) |
| 2 | `NodeRED_Temperatur_Archiv` | ~498k | ~5 weeks rolling | Temp, humidity, pressure, PM10/PM2.5, UV, radiation, precipitation, wind |
| 3 | `NodeRED_Regenschreiber_Archiv` | ~40k | ~2 months rolling | Rain gauge (tipping-bucket "clicks") |
| 4 | `NodeRED_Bodensensoren_Archiv` | ~5k | ~2 months rolling | Soil moisture & temperature |

\* Counts and ranges as observed July 2026. Archives are **rolling windows** — old
rows drop off, so pull periodically and accumulate for long-term series.

Water-level gauges (`beschreibung = 'Wasserpegel-Sensor'`) are currently present
only in layer 1. No dedicated SensorCity archive layer is exposed for their
history.

> **Upstream change (July 2026).** The service dropped the waste-container
> dataset: the `NodeRED_TSK_Archiv` layer is gone, the archive layers below it
> renumbered (Regenschreiber 4→3, Bodensensoren 5→4), and
> `beschreibung = 'TSK-Container'` now matches zero live rows. In the same
> revision the weather category was renamed `Temperatur` → `Temperatur-Sensor`.

The app supplements the Maxau/Rhein gauge (`device_id = 9016`) with recent
water-level history from PEGELONLINE, because that station is also published by
WSV. The current mapping lives in `src/config/historySources.ts`.

---

## Query endpoint

```
GET  {BASE}/{layerId}/query
```

Standard [ArcGIS Feature Service query](https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/) operation.

### Common parameters

| Parameter | Example | Notes |
|-----------|---------|-------|
| `where` | `1=1` | SQL filter. Required (use `1=1` for all). |
| `outFields` | `*` | Comma-separated field list, or `*` for all. |
| `orderByFields` | `measured_at ASC` | Sort; needed for stable pagination. |
| `resultOffset` | `2000` | Skip N rows (pagination). |
| `resultRecordCount` | `2000` | Page size; **max 2000** (`maxRecordCount`). |
| `returnGeometry` | `false` | Set `false` if you only need attributes. |
| `returnCountOnly` | `true` | Return just the match count. |
| `outStatistics` | see below | Min/max/count/avg aggregation. |
| `groupByFieldsForStatistics` | `name` | Group statistics (e.g. per station). |
| `f` | `json` | Output format: `json` or `geojson`. **`csv` is not supported on query.** |

### Key fields

- `measured_at`, `inserted_at` — **epoch milliseconds, UTC** (divide by 1000 for seconds).
- `name` — station label, e.g. `003 - Kreuzung Herrenalber Strasse - Battstrasse`.
- `device_id` — stable per-sensor UUID; best key for a single station's history.
- Measurement fields vary by layer: `temp`, `luftfeuchte` (humidity), `press`,
  `pm10`, `pm25`, `sonnenstrahlung` (solar radiation), `niederschlag` (precip),
  `windgeschwindigkeit`, `fillinglvl_percent`, `clicks`, `pegel` (water level, cm).
  The soil layers expose `soil_moisture_at_depth_0..7` and
  `soil_temperature_at_depth_0..7` — note the field suffix is the band number
  followed by a literal `1` (`soil_moisture_at_depth_01` is band 0,
  `..._71` is band 7). As of July 2026 these carry the soil feed (97 of 99
  sensors); the older flat `bodenfeuchte` / `bodentemperatur` fields still exist
  but are now empty for all but 2 sensors.
  **Only bands 0–5 hold readings.** Bands 6 and 7 return the device's
  not-connected sentinel on every reporting probe — `-328` °C (below absolute
  zero) and `-5` % moisture. Filter them out rather than plotting them.

---

## Examples

**Count rows in a layer**

```
{BASE}/2/query?where=1=1&returnCountOnly=true&f=json
```

**Latest readings for one station**

```
{BASE}/2/query?where=name LIKE '003%'&outFields=name,measured_at,temp,luftfeuchte&orderByFields=measured_at DESC&resultRecordCount=10&returnGeometry=false&f=json
```

**Full history for one sensor by device_id**

```
{BASE}/2/query?where=device_id='25865bf9-41f8-453a-b44f-157901d81df0'&outFields=*&orderByFields=measured_at ASC&returnGeometry=false&f=json
```

**Readings after a timestamp** (epoch-ms; e.g. 2026-06-01 = `1780272000000`)

```
{BASE}/2/query?where=measured_at >= 1780272000000&outFields=*&f=json
```

**Distinct stations with reading counts**

```
{BASE}/2/query?where=1=1&groupByFieldsForStatistics=name&outStatistics=[{"statisticType":"count","onStatisticField":"objectid","outStatisticFieldName":"cnt"}]&f=json
```

**Date range of an archive**

```
{BASE}/2/query?where=1=1&outStatistics=[{"statisticType":"min","onStatisticField":"measured_at","outStatisticFieldName":"mn"},{"statisticType":"max","onStatisticField":"measured_at","outStatisticFieldName":"mx"}]&f=json
```

> Remember to URL-encode parameter values (spaces, `'`, `%`, `[`, `{`, …) in real requests.

---

## Pagination

Each response returns at most 2000 features and sets
`"exceededTransferLimit": true` when more remain. To pull everything, loop:

1. Start `resultOffset = 0`, `resultRecordCount = 2000`, with a stable `orderByFields`.
2. Read the page, then increase `resultOffset` by the number of features returned.
3. Stop when a page returns fewer than 2000 rows and `exceededTransferLimit` is absent/false.

---

## Notes & limits

- Read-only in practice. (The service advertises edit capabilities, but treat it as read-only.)
- `f=csv` works only on the service-level export operation, **not** on `/query`. Use `json`/`geojson` and convert client-side.
- Archives are rolling windows, not the full project lifetime.
- This is an unofficial reference; field availability and retention may change without notice. Verify against `{BASE}/{layerId}?f=json`.
