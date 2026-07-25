// Small numeric helpers shared across views.

/** Arithmetic mean of a numeric array; null for an empty array. */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/**
 * Middle value of a numeric array (mean of the two middle values when even);
 * null for an empty array. Preferred over `mean` for a typical reading, where a
 * single miscalibrated probe should not move the answer.
 */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
