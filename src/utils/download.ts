/**
 * Trigger a client-side download of in-memory text as a named file. Wraps the
 * object-URL + temporary-anchor dance (and its cleanup) so callers just say
 * what to save; used by the query export and the sensor history CSV export.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mime: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
