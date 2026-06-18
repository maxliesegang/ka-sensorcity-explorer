// Small HTML helpers for content injected into Leaflet popups/tooltips, which
// take raw HTML strings rather than React nodes.

/** HTML-escape a string for safe inclusion in popup/tooltip markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
