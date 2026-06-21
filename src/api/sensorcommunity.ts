// Standalone client for sensor.community (formerly luftdaten.info) open data.
//
// sensor.community is a global network of self-built citizen air-quality and
// climate sensors. Its area filter returns every measurement reported in the
// last ~5 minutes within a radius of a point, so we scope it to Karlsruhe and
// keep each sensor's latest air-temperature value to blend into the live field.
//
// Different origin than the ArcGIS FeatureServer, so this uses plain `fetch`.

import {
  KARLSRUHE_AREA as AREA,
  SENSOR_COMMUNITY_BASE_URL as BASE_URL,
} from "../config/endpoints";
import {
  isPlausibleAirTemperature,
  type ExternalTemperatureReading,
} from "../utils/combinedTemperatureField";
import { isRecentReading } from "../utils/sensorFreshness";

// Minimal shape of the parts of a sensor.community record we consume.
interface SensorCommunityDataValue {
  value_type?: string;
  value?: string | number | null;
}

interface SensorCommunityRecord {
  timestamp?: string;
  sensordatavalues?: SensorCommunityDataValue[];
  location?: { latitude?: string | number; longitude?: string | number } | null;
  sensor?: { id?: number | string } | null;
}

/** Parse a sensor.community UTC timestamp ("YYYY-MM-DD HH:mm:ss") to epoch ms. */
function parseTimestamp(value: string | undefined): number {
  if (!value) return NaN;
  // The API emits naive UTC; make that explicit so it isn't read as local time.
  return Date.parse(value.replace(" ", "T") + "Z");
}

/**
 * Parse a value to a finite number, treating missing/empty values as absent.
 * `Number(null)` / `Number("")` are 0, so the explicit guard keeps those from
 * masquerading as a real reading or coordinate.
 */
function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function temperatureValue(record: SensorCommunityRecord): number | null {
  for (const entry of record.sensordatavalues ?? []) {
    if (entry.value_type === "temperature") {
      const value = finiteNumber(entry.value);
      // Drop faulty-sensor spikes (e.g. a broken BME280 reading -142 °C).
      return value != null && isPlausibleAirTemperature(value) ? value : null;
    }
  }
  return null;
}

/**
 * Fetch the latest air-temperature reading from every sensor.community device
 * around Karlsruhe. The area filter returns roughly the last few minutes of
 * data; we still keep the newest record per sensor and enforce the same 1-hour
 * freshness window as the other sources explicitly. Throws on HTTP/network
 * failure; callers run this through `useAsync`, which surfaces the error as a
 * non-fatal "community data unavailable" notice rather than breaking the map.
 */
export async function fetchSensorCommunityTemperatures(
  signal?: AbortSignal,
): Promise<ExternalTemperatureReading[]> {
  const url = `${BASE_URL}/airrohr/v1/filter/area=${AREA.lat},${AREA.lon},${AREA.radiusKm}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`sensor.community request failed: HTTP ${res.status}`);
  }

  const rows = (await res.json()) as SensorCommunityRecord[];
  if (!Array.isArray(rows)) return [];

  // Keep the newest record per sensor id (the feed can repeat a sensor).
  const now = Date.now();
  const latest = new Map<string, ExternalTemperatureReading>();
  for (const record of rows) {
    const id = record.sensor?.id;
    if (id == null) continue;

    const temperature = temperatureValue(record);
    if (temperature == null) continue;

    const lat = finiteNumber(record.location?.latitude);
    const lon = finiteNumber(record.location?.longitude);
    if (lat == null || lon == null) continue;

    const measuredAt = parseTimestamp(record.timestamp);
    // Only keep readings from the last hour, matching the SensorCity and
    // openSenseMap "recently measured" window so every source is treated alike.
    if (!isRecentReading(measuredAt, now)) continue;

    const key = String(id);
    const existing = latest.get(key);
    if (!existing || measuredAt > existing.measuredAt) {
      latest.set(key, {
        id: key,
        name: `sensor.community #${key}`,
        lat,
        lon,
        temperature,
        measuredAt,
      });
    }
  }

  return Array.from(latest.values());
}
