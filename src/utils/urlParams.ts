// Coercion helpers for reading deep-link state out of URL search params.
//
// Deep-link state is kept in the URL so any view is shareable by copying the
// address bar. Raw params are untrusted strings (hand-edited, stale, or from an
// older build), so every read goes through one of these guards, which fall back
// to a safe default rather than trusting the input. The URL is the source of
// truth; these turn it back into typed values.

/** Coerce a raw URL param to one of `allowed`, falling back when it is absent or unknown. */
export function toEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return value != null && allowed.includes(value as T) ? (value as T) : fallback;
}

/** Coerce a raw URL param to a positive integer, falling back when it is not one. */
export function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Coerce a raw URL param to a boolean. `"1"`/`"true"` are true and `"0"`/`"false"`
 * are false; anything else (including an absent param) falls back. Serialize with
 * `toBoolParam` so the two stay in sync.
 */
export function toBool(value: string | null, fallback: boolean): boolean {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return fallback;
}

/** Serialize a boolean to its URL param form, matching what `toBool` parses. */
export function toBoolParam(value: boolean): string {
  return value ? "1" : "0";
}
