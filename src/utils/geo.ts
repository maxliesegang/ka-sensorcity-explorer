// Distance between two points on the ground, and the sensors nearest to one.
//
// "Which sensors are near me?" is the most concrete question a resident brings
// to this data, and it is answerable entirely on the client: the live layer
// already carries every sensor's coordinates, so no position ever leaves the
// browser.

import type { Sensor } from "../types";

const EARTH_RADIUS_M = 6_371_000;

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface NearbySensor {
  sensor: Sensor;
  distanceMeters: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance in metres (haversine). Karlsruhe fits in a few
 * kilometres, so the spherical-earth error here is far below the accuracy of a
 * browser geolocation fix.
 */
export function distanceMeters(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * The `limit` geolocated sensors closest to `origin`, nearest first. Sensors
 * without coordinates are skipped — being unplaceable, they have no distance.
 */
export function getNearestSensors(
  sensors: readonly Sensor[],
  origin: Coordinates,
  limit = 3,
): NearbySensor[] {
  const placed: NearbySensor[] = [];
  for (const sensor of sensors) {
    if (sensor.lat == null || sensor.lon == null) continue;
    placed.push({
      sensor,
      distanceMeters: distanceMeters(origin, { lat: sensor.lat, lon: sensor.lon }),
    });
  }
  return placed
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, Math.max(0, limit));
}

/** Distance as "480 m" / "1.4 km" — metres below a kilometre, else one decimal. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
