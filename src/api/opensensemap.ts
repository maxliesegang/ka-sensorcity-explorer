// Standalone client for openSenseMap (https://opensensemap.org) community boxes.
//
// openSenseMap is a citizen-science platform of self-hosted "boxes", each with
// one or more phenomenon sensors. We scope the query to a bounding box around
// Karlsruhe and pull every box's latest air-temperature reading so the live
// temperature map can blend community stations with the city's own SensorCity
// network.
//
// Different origin than the ArcGIS FeatureServer, so this uses plain `fetch`
// (CORS-friendly) rather than arcgis.ts's fetchJson.

import {
  KARLSRUHE_BBOX as BBOX,
  OPENSENSEMAP_BASE_URL as BASE_URL,
} from "../config/endpoints";
import { isRecentReading } from "../utils/sensorFreshness";
import {
  isPlausibleAirTemperature,
  type ExternalTemperatureReading,
} from "../utils/combinedTemperatureField";

// Minimal shape of the parts of an openSenseMap box we consume.
interface OpenSenseMapMeasurement {
  value?: string | number | null;
  createdAt?: string;
}

interface OpenSenseMapSensor {
  title?: string;
  unit?: string;
  lastMeasurement?: OpenSenseMapMeasurement | null;
}

interface OpenSenseMapBox {
  _id?: string;
  name?: string;
  currentLocation?: { coordinates?: number[] } | null;
  loc?: Array<{ geometry?: { coordinates?: number[] } }>;
  sensors?: OpenSenseMapSensor[];
}

/**
 * Pick a box's air-temperature sensor. Matches "temperatur"/"temperature" in the
 * title while skipping soil/water variants (e.g. "Bodentemperatur"), which read
 * very differently from air and would distort the field.
 */
function pickTemperatureSensor(
  sensors: OpenSenseMapSensor[],
): OpenSenseMapSensor | null {
  for (const sensor of sensors) {
    const title = (sensor.title ?? "").toLowerCase();
    if (!/temp(eratur|erature)?/.test(title)) continue;
    if (/(boden|soil|wasser|water|grund|ground)/.test(title)) continue;
    const unit = (sensor.unit ?? "").toLowerCase();
    if (unit && !unit.includes("c")) continue; // expect °C
    return sensor;
  }
  return null;
}

/** Read a box's [lng, lat] from either the current or legacy location field. */
function boxCoordinates(box: OpenSenseMapBox): [number, number] | null {
  const coords =
    box.currentLocation?.coordinates ?? box.loc?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lon, lat] = coords;
  return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null;
}

function toReading(
  box: OpenSenseMapBox,
  now: number,
): ExternalTemperatureReading | null {
  if (!box._id || !box.sensors) return null;
  const sensor = pickTemperatureSensor(box.sensors);
  const measurement = sensor?.lastMeasurement;
  if (!measurement) return null;

  // Guard the missing/empty case: `Number(null)` / `Number("")` are 0, which
  // would otherwise pass the plausibility check and inject a fake 0 °C reading.
  if (measurement.value == null || measurement.value === "") return null;
  const temperature = Number(measurement.value);
  // Drop faulty-sensor spikes that would blow out the shared colour scale.
  if (!isPlausibleAirTemperature(temperature)) return null;

  const measuredAt = measurement.createdAt ? Date.parse(measurement.createdAt) : NaN;
  // Only keep fresh readings, matching the SensorCity "recently measured" window.
  if (!isRecentReading(measuredAt, now)) return null;

  const coords = boxCoordinates(box);
  if (!coords) return null;
  const [lon, lat] = coords;

  return {
    id: box._id,
    name: box.name?.trim() || box._id,
    lat,
    lon,
    temperature,
    measuredAt,
  };
}

/**
 * Fetch the latest fresh air-temperature reading from every openSenseMap box in
 * the Karlsruhe bounding box. Throws on HTTP/network failure; callers run this
 * through `useAsync`, which surfaces the error as a non-fatal "community data
 * unavailable" notice rather than breaking the map.
 */
export async function fetchOpenSenseMapTemperatures(
  signal?: AbortSignal,
): Promise<ExternalTemperatureReading[]> {
  const url = new URL(`${BASE_URL}/boxes`);
  url.searchParams.set(
    "bbox",
    `${BBOX.minLng},${BBOX.minLat},${BBOX.maxLng},${BBOX.maxLat}`,
  );
  url.searchParams.set("format", "json");
  // `full=true` expands each sensor's `lastMeasurement` from a bare id reference
  // into the `{ value, createdAt }` object we read; without it there is no value.
  url.searchParams.set("full", "true");

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`openSenseMap request failed: HTTP ${res.status}`);
  }

  const boxes = (await res.json()) as OpenSenseMapBox[];
  if (!Array.isArray(boxes)) return [];

  const now = Date.now();
  return boxes
    .map((box) => toReading(box, now))
    .filter((reading): reading is ExternalTemperatureReading => reading != null);
}
