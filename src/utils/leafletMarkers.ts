// Shared presentation + interaction for the sensor circle markers used by the
// Leaflet map views (sensor map, temperature map). Centralising this keeps the
// hover/active behaviour and the popup/tooltip styling hooks identical across
// views, so the maps read as one design.

import L from "leaflet";

import { formatReadingTime } from "./format";
import { escapeHtml } from "./html";

/** Tooltip options that opt the label into the KERN-styled `.sensor-tooltip`. */
export const SENSOR_TOOLTIP_OPTIONS: L.TooltipOptions = {
  direction: "top",
  offset: [0, -6],
  className: "sensor-tooltip",
};

/** Popup options that opt the popup into the KERN-styled `.sensor-popup`. */
export const SENSOR_POPUP_OPTIONS: L.PopupOptions = {
  className: "sensor-popup",
  closeButton: true,
  offset: [0, -4],
};

export interface SensorPopupContent {
  /** Accent colour for the leading dot (category or heat colour). */
  color: string;
  /** Short heading line above the name (category or measurement label). */
  label: string;
  name: string;
  /** Secondary line, e.g. the current reading or its age. */
  meta: string;
  /** Optional smaller, muted line below `meta`. Overrides `readingTime`. */
  note?: string;
  /** Epoch-ms timestamp used to render the standard "Reading at …" note. */
  readingTime?: number | null;
  /**
   * Link target (hash route or external URL) for the call to action. Omit both
   * `href` and `cta` for sources with no per-sensor page — the link is dropped.
   */
  href?: string;
  cta?: string;
  /**
   * Optional secondary button. Rendered with the `sensor-popup__action` class
   * (and `data-popup-action`) so callers can wire its click on `popupopen`.
   */
  action?: { label: string };
}

/** Build the shared sensor popup markup: accent dot + label, name, meta, link. */
export function sensorPopupHtml({
  color,
  label,
  name,
  meta,
  note,
  readingTime,
  href,
  cta,
  action,
}: SensorPopupContent): string {
  const popupNote =
    note ?? (readingTime != null ? formatReadingTime(readingTime) : undefined);
  const actionButton = action
    ? `<button type="button" class="sensor-popup__action" data-popup-action>${escapeHtml(action.label)}</button>`
    : "";
  const noteLine = popupNote
    ? `<span class="sensor-popup__note">${escapeHtml(popupNote)}</span>`
    : "";
  const link =
    href && cta
      ? `<a class="sensor-popup__link" href="${escapeHtml(href)}">
      ${escapeHtml(cta)}
      <span aria-hidden="true">→</span>
    </a>`
      : "";
  return `
    <span class="sensor-popup__cat">
      <span class="cat-dot" style="background:${escapeHtml(color)}"></span>
      ${escapeHtml(label)}
    </span>
    <strong class="sensor-popup__name">${escapeHtml(name)}</strong>
    <span class="sensor-popup__meta">${escapeHtml(meta)}</span>
    ${noteLine}
    ${link}
    ${actionButton}
  `;
}

/**
 * Wire a click handler onto a popup's action button (the one rendered by
 * `sensorPopupHtml`'s `action`). The button lives in the popup's raw HTML, which
 * Leaflet only mounts on open, so the listener is (re)attached on `popupopen`
 * and torn down on `popupclose`. No-op for popups without an action button.
 */
export function bindPopupAction(layer: L.Layer, onAction: () => void): void {
  layer.on("popupopen", (event: L.PopupEvent) => {
    const button = event.popup
      .getElement()
      ?.querySelector<HTMLButtonElement>("[data-popup-action]");
    if (!button) return;
    button.addEventListener("click", onAction);
    layer.once("popupclose", () => button.removeEventListener("click", onAction));
  });
}

/** Ring size (and optional colour) for one marker interaction state. */
interface MarkerState {
  radius: number;
  weight: number;
}

export interface MarkerInteractionStyles {
  /** Resting style; `color` is the ring colour restored on mouse-out/close. */
  rest: MarkerState & { color: string };
  /** Grown ring while hovered (but not the active marker). */
  hover: MarkerState;
  /** Grown ring while this marker's popup is open. */
  active: MarkerState;
}

/**
 * Wire hover + open-popup affordances onto a set of circle markers: the ring
 * grows on hover, and the marker whose popup is open stays highlighted. Returns
 * an `attach(marker, activeColor?)` to call once per marker — it tracks the
 * active marker across the set, so opening one popup restores the previous one.
 * Create one controller per repopulation of the layer (the closure state is
 * tied to that batch of markers).
 */
export function createMarkerInteractions(styles: MarkerInteractionStyles) {
  let activeMarker: L.CircleMarker | null = null;

  const resetToRest = (marker: L.CircleMarker) =>
    marker.setStyle({
      radius: styles.rest.radius,
      weight: styles.rest.weight,
      color: styles.rest.color,
    });

  return function attach(marker: L.CircleMarker, activeColor?: string): void {
    marker.on("mouseover", () => {
      if (marker !== activeMarker) marker.setStyle(styles.hover);
    });
    marker.on("mouseout", () => {
      if (marker !== activeMarker) resetToRest(marker);
    });
    marker.on("popupopen", () => {
      if (activeMarker && activeMarker !== marker) resetToRest(activeMarker);
      activeMarker = marker;
      marker.setStyle(activeColor ? { ...styles.active, color: activeColor } : styles.active);
    });
    marker.on("popupclose", () => {
      if (activeMarker === marker) activeMarker = null;
      resetToRest(marker);
    });
  };
}
