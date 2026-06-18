// Voronoi (Thiessen) cells for geolocated points, clipped to the points'
// convex hull. Pure planar math in [x=lon, y=lat] — fine at city scale — with
// no React/Leaflet/DOM dependency. Output rings are [lat, lon] for Leaflet.

import { Delaunay } from "d3-delaunay";

export interface VoronoiCell<T> {
  point: T; // the originating point
  polygon: Array<[number, number]>; // ring as [lat, lon] pairs, Leaflet-ready, NOT closed
}

type Pt = [number, number]; // [x=lon, y=lat]

/** Andrew's monotone-chain convex hull. Returns CCW ring (no repeated vertex). */
function convexHull(pts: Pt[]): Pt[] {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const n = p.length;
  if (n < 3) return p;

  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0)
      lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0)
      upper.pop();
    upper.push(q);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper); // CCW
}

/** Expand a hull outward from its centroid by factor (1 + pad). */
function expandHull(hull: Pt[], pad: number): Pt[] {
  let cx = 0;
  let cy = 0;
  for (const h of hull) {
    cx += h[0];
    cy += h[1];
  }
  cx /= hull.length;
  cy /= hull.length;
  const f = 1 + pad;
  return hull.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f] as Pt);
}

/**
 * Sutherland–Hodgman clip of `poly` against the convex `clip` ring (CCW).
 * Inside test uses the left-of-edge half-plane (positive cross for CCW winding).
 */
function clipPolygon(poly: Pt[], clip: Pt[]): Pt[] {
  let output = poly;
  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) break;
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const input = output;
    output = [];

    // Signed distance to the line a->b; >= 0 means inside (left) for CCW winding.
    const side = (p: Pt) =>
      (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

    for (let j = 0; j < input.length; j++) {
      const cur = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      const dCur = side(cur);
      const dPrev = side(prev);
      const curIn = dCur >= 0;
      const prevIn = dPrev >= 0;

      if (curIn) {
        if (!prevIn) output.push(intersect(prev, cur, dPrev, dCur));
        output.push(cur);
      } else if (prevIn) {
        output.push(intersect(prev, cur, dPrev, dCur));
      }
    }
  }
  return output;
}

/** Edge intersection by signed-distance interpolation (guards zero denom). */
function intersect(p: Pt, q: Pt, dp: number, dq: number): Pt {
  const denom = dp - dq;
  const t = Math.abs(denom) < 1e-12 ? 0 : dp / denom;
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
}

export function voronoiCells<T extends { lat: number; lon: number }>(
  points: T[],
  opts?: { hullPadding?: number },
): VoronoiCell<T>[] {
  if (points.length < 3) return [];
  const pad = opts?.hullPadding ?? 0.06;

  // Clip polygon: the input hull, expanded outward. Degenerate (collinear) -> [].
  const hull = convexHull(points.map((p) => [p.lon, p.lat] as Pt));
  if (hull.length < 3) return [];
  const clip = expandHull(hull, pad);

  // Point extent, padded generously so the bbox never clips before the hull does.
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;
  for (const p of points) {
    if (p.lon < xmin) xmin = p.lon;
    if (p.lon > xmax) xmax = p.lon;
    if (p.lat < ymin) ymin = p.lat;
    if (p.lat > ymax) ymax = p.lat;
  }
  const padX = (xmax - xmin) * 0.5 + 1e-3;
  const padY = (ymax - ymin) * 0.5 + 1e-3;

  const d = Delaunay.from(
    points,
    (p) => p.lon,
    (p) => p.lat,
  );
  const v = d.voronoi([xmin - padX, ymin - padY, xmax + padX, ymax + padY]);

  const out: VoronoiCell<T>[] = [];
  for (let i = 0; i < points.length; i++) {
    const cell = v.cellPolygon(i);
    if (!cell) continue;
    // d3 returns a closed ring [x,y]; drop the repeated closing vertex.
    const ring = cell.slice(0, cell.length - 1) as Pt[];
    const clipped = clipPolygon(ring, clip);
    if (clipped.length < 3) continue;
    out.push({
      point: points[i],
      polygon: clipped.map(([x, y]) => [y, x] as [number, number]),
    });
  }
  return out;
}
