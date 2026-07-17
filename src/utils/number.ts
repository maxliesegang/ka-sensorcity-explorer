// Numeric coercion at the API boundary.

/**
 * Narrow an unknown value to a usable number, or null.
 *
 * The feed types its numeric attributes loosely and populates them unevenly: a
 * field can arrive as a number, as null, or (for layers that declare a field
 * they never fill) be absent entirely. Everything reading a raw attribute needs
 * the same guard, so it lives here rather than once per module — `Number(x)`
 * would turn null into 0 and a missing field into NaN, both of which render as
 * a reading that was never taken.
 */
export function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
