// Minimal RFC 4180 CSV serialization. Both the query export and the sensor
// history export build a grid of rows and hand it here, so escaping lives in
// exactly one place.

export type CsvCell = string | number | boolean | null | undefined;

/**
 * Escape one field: an empty string for nullish, otherwise the value quoted
 * only when it contains a delimiter, quote or newline (embedded quotes are
 * doubled). Leaving benign values unquoted keeps the output readable.
 */
export function escapeCsvCell(value: CsvCell): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Serialize a grid of rows (the first row is typically the header) to CSV. */
export function rowsToCsv(rows: readonly CsvCell[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}
