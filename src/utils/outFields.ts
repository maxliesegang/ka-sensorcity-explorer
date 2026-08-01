// `outFields` is the ArcGIS wire syntax for "which columns should the service
// return": either the wildcard `*` or a comma-separated explicit list. The two
// must never coexist — a list containing `*` is not a form the service wants —
// and that is the whole reason this lives in one place rather than as string
// juggling at the call site.
//
// Pure string algebra over a wire format, so it belongs beside the other API
// helpers rather than inside the view that happens to render the picker.

/** The form the service wants for "no explicit selection". */
export const ALL_OUT_FIELDS = "*";

/**
 * The fields an `outFields` string names explicitly, in order — empty for `*`,
 * for a blank string, and for the spacing a hand-edited list picks up.
 */
export function parseOutFields(outFields: string): string[] {
  return outFields
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "" && entry !== ALL_OUT_FIELDS);
}

/**
 * Toggle one field in an `outFields` list. `*` means "everything", so the first
 * pick starts a fresh explicit list rather than appending to a wildcard; taking
 * the last field back out returns to `*`.
 */
export function toggleOutField(outFields: string, field: string): string {
  const current = parseOutFields(outFields);
  const next = current.includes(field)
    ? current.filter((entry) => entry !== field)
    : [...current, field];
  return next.length === 0 ? ALL_OUT_FIELDS : next.join(",");
}
