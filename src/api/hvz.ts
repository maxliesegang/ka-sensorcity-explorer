// LUBW/HVZ water-level history published through a separate Karlsruhe
// FeatureServer from the main SensorCity live and archive layers.

import { HVZ_WATER_LEVEL_LAYER_URL } from "../config/endpoints";
import { isDemoMode, loadDemoApi } from "../demo/mode";
import { toFiniteNumber } from "../utils/number";
import { queryAllFromLayer } from "./arcgis";
import type { TimeSeriesPoint } from "./sensorcity";

/** Fetch one HVZ station's retained water-level history, oldest to newest. */
export async function fetchHvzWaterLevelHistory(
  stationId: number,
  signal?: AbortSignal,
): Promise<TimeSeriesPoint[]> {
  if (!Number.isInteger(stationId)) throw new Error("HVZ station id must be an integer");
  if (isDemoMode()) return (await loadDemoApi()).hvzWaterLevelHistory(stationId);

  const features = await queryAllFromLayer(
    HVZ_WATER_LEVEL_LAYER_URL,
    {
      where: `srid=${stationId}`,
      outFields: "datum,pegel",
      orderByFields: "datum ASC,objectid ASC",
    },
    {},
    signal,
  );
  const points: TimeSeriesPoint[] = [];
  for (const feature of features) {
    const timestamp = toFiniteNumber(feature.attributes.datum);
    const value = toFiniteNumber(feature.attributes.pegel);
    if (timestamp != null && value != null) points.push({ timestamp, value });
  }
  return points;
}
