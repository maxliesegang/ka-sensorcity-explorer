// Shared presentation + interaction for the sensor circle markers used by the
// map-based views (sensor map, temperature map). Centralising this keeps the
// hover/active behaviour and the popup/tooltip styling identical across views,
// so the maps read as one design.
//
// The interaction controller is deliberately domain-agnostic: each feature
// carries its own pre-built popup HTML and tooltip text in its properties
// (`popup`, `tooltip`), plus a `color` and optional `isHighlighted` flag the GPU
// paint reads. So `bindInteractiveCircleLayer` knows nothing about sensors — a new
// kind of point layer reuses it by filling the same property slots.

import * as maplibregl from "maplibre-gl";

import { formatReadingTime } from "./format";
import { escapeHtml } from "./html";
import { isMapActive, type FeatureId } from "./maplibreGeoJson";

/** Standard property keys every interactive circle feature is expected to carry. */
export interface InteractiveFeatureProperties {
  /** Fill colour (category or heat colour). */
  color: string;
  /** Pre-built popup HTML (see `buildSensorPopupHtml`). */
  popup: string;
  /** Plain hover-tooltip text (rendered as a text node, so it needs no escaping). */
  tooltip: string;
  /** Draws a thicker, contrasting ring (e.g. the temperature baseline station). */
  isHighlighted?: boolean;
  /** Any extra fields a popup action needs (e.g. a sensor id). */
  [key: string]: string | number | boolean | undefined;
}

export interface SensorPopupOptions {
  /** Accent colour for the leading dot (category or heat colour). */
  color: string;
  /** Short heading line above the name (category or measurement label). */
  label: string;
  name: string;
  /** Secondary line, e.g. the current reading or its age. */
  readingSummary: string;
  /** Optional smaller, muted line below `readingSummary`. Overrides `readingTime`. */
  note?: string;
  /** Epoch-ms timestamp used to render the standard "Reading at …" note. */
  readingTime?: number | null;
  /**
   * Link target (hash route or external URL) for the call to action. Omit both
   * `href` and `linkLabel` for sources with no per-sensor page — the link is dropped.
   */
  href?: string;
  linkLabel?: string;
  /**
   * Optional secondary button. Rendered with the `sensor-popup__action` class
   * (and `data-popup-action`) so callers can wire its click via `onPopupAction`.
   */
  secondaryAction?: { label: string };
}

/** Build the shared sensor popup markup: accent dot, label, name, reading, and link. */
export function buildSensorPopupHtml({
  color,
  label,
  name,
  readingSummary,
  note,
  readingTime,
  href,
  linkLabel,
  secondaryAction,
}: SensorPopupOptions): string {
  const popupNote =
    note ?? (readingTime != null ? formatReadingTime(readingTime) : undefined);
  const secondaryActionButton = secondaryAction
    ? `<button type="button" class="sensor-popup__action" data-popup-action>` +
      `${escapeHtml(secondaryAction.label)}</button>`
    : "";
  const noteLine = popupNote
    ? `<span class="sensor-popup__note">${escapeHtml(popupNote)}</span>`
    : "";
  const link =
    href && linkLabel
      ? `<a class="sensor-popup__link" href="${escapeHtml(href)}">
      ${escapeHtml(linkLabel)}
      <span aria-hidden="true">→</span>
    </a>`
      : "";
  return `
    <span class="sensor-popup__cat">
      <span class="cat-dot" style="background:${escapeHtml(color)}"></span>
      ${escapeHtml(label)}
    </span>
    <strong class="sensor-popup__name">${escapeHtml(name)}</strong>
    <span class="sensor-popup__meta">${escapeHtml(readingSummary)}</span>
    ${noteLine}
    ${link}
    ${secondaryActionButton}
  `;
}

/** Ring size (radius + stroke width) for one marker interaction state. */
export interface CircleMarkerDimensions {
  radius: number;
  strokeWidth: number;
}

export interface InteractiveCircleStyle {
  default: CircleMarkerDimensions;
  hovered: CircleMarkerDimensions;
  active: CircleMarkerDimensions;
  /** Size for an `isHighlighted` feature; falls back to `default` when omitted. */
  highlighted?: CircleMarkerDimensions;
  /** Fill opacity (default 0.9). Field markers use 1 to read as solid dots over cells. */
  opacity?: number;
}

/**
 * Data-driven paint for an interactive circle layer: fill from the feature's
 * `color`, and radius/stroke that grow with the `hover`/`active` feature-state
 * (set by `bindInteractiveCircleLayer`) or the `isHighlighted` property. All resolved on
 * the GPU, so hover stays smooth with hundreds of markers.
 */
export function createInteractiveCirclePaint(
  style: InteractiveCircleStyle,
): maplibregl.CircleLayerSpecification["paint"] {
  const highlighted = style.highlighted ?? style.default;
  const byState = (active: number, hover: number, flagged: number, rest: number) =>
    [
      "case",
      ["boolean", ["feature-state", "active"], false], active,
      ["boolean", ["feature-state", "hover"], false], hover,
      ["boolean", ["get", "isHighlighted"], false], flagged,
      rest,
    ] as unknown as maplibregl.ExpressionSpecification;

  return {
    "circle-color": ["get", "color"],
    "circle-opacity": style.opacity ?? 0.9,
    "circle-radius": byState(
      style.active.radius,
      style.hovered.radius,
      highlighted.radius,
      style.default.radius,
    ),
    "circle-stroke-width": byState(
      style.active.strokeWidth,
      style.hovered.strokeWidth,
      highlighted.strokeWidth,
      style.default.strokeWidth,
    ),
    "circle-stroke-color": [
      "case",
      ["boolean", ["get", "isHighlighted"], false], "#131525",
      "#ffffff",
    ] as unknown as maplibregl.ExpressionSpecification,
  };
}

/**
 * Grow a circle layer's ring while the pointer is over a marker, via the `hover`
 * feature-state that `createInteractiveCirclePaint` reads. Returns a cleanup that clears the
 * listeners and any lingering state.
 */
export function bindCircleHoverState(
  map: maplibregl.Map,
  { sourceId, layerId }: { sourceId: string; layerId: string },
): () => void {
  let hoveredId: FeatureId | null = null;
  const setHoveredState = (id: FeatureId | null, isHovered: boolean) => {
    if (id != null && isMapActive(map)) {
      map.setFeatureState({ source: sourceId, id }, { hover: isHovered });
    }
  };

  const onMove = (event: maplibregl.MapLayerMouseEvent) => {
    const id = event.features?.[0]?.id ?? null;
    if (hoveredId === id) return;
    setHoveredState(hoveredId, false);
    hoveredId = id;
    setHoveredState(hoveredId, true);
  };
  const onLeave = () => {
    setHoveredState(hoveredId, false);
    hoveredId = null;
  };

  map.on("mousemove", layerId, onMove);
  map.on("mouseleave", layerId, onLeave);
  return () => {
    map.off("mousemove", layerId, onMove);
    map.off("mouseleave", layerId, onLeave);
    setHoveredState(hoveredId, false);
  };
}

export interface FeaturePopupOptions {
  /** Layers whose features open the popup / show the tooltip (e.g. cells + markers). */
  layerIds: string[];
  /**
   * Source whose feature gets the `active` state while its popup is open. Cells
   * and markers share a feature id (the sensor's objectId), so pointing this at
   * the markers source keeps the marker highlighted even when its cell is clicked.
   */
  activeSourceId: string;
  popupClassName?: string;
  tooltipClassName?: string;
  /**
   * Called when a popup's action button (rendered by `buildSensorPopupHtml`'s
   * `secondaryAction`) is clicked. Receives the clicked feature's properties and the live
   * popup (so the handler can close it).
   */
  onPopupAction?: (properties: InteractiveFeatureProperties, popup: maplibregl.Popup) => void;
}

/**
 * Wire hover tooltips + click popups onto one or more layers. The clicked feature
 * stays highlighted (via `active` feature-state on `activeSourceId`) while its
 * popup is open. Popups anchor to a point feature's own coordinates, or to the
 * cursor for area (polygon) features. Returns a cleanup removing every listener.
 */
export function bindFeaturePopups(
  map: maplibregl.Map,
  {
    layerIds,
    activeSourceId,
    popupClassName,
    tooltipClassName,
    onPopupAction,
  }: FeaturePopupOptions,
): () => void {
  const tooltip = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: tooltipClassName,
    offset: 10,
  });
  const popup = new maplibregl.Popup({ className: popupClassName, offset: 10 });
  let activeId: FeatureId | null = null;
  const setActiveState = (id: FeatureId | null, isActive: boolean) => {
    if (id != null && isMapActive(map)) {
      map.setFeatureState({ source: activeSourceId, id }, { active: isActive });
    }
  };

  const onMove = (event: maplibregl.MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) return;
    map.getCanvas().style.cursor = "pointer";
    const text = feature.properties?.tooltip;
    if (text) tooltip.setLngLat(event.lngLat).setText(String(text)).addTo(map);
  };
  const onLeave = () => {
    map.getCanvas().style.cursor = "";
    tooltip.remove();
  };
  const onClick = (event: maplibregl.MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const properties = (feature.properties ?? {}) as InteractiveFeatureProperties;
    const lngLat =
      feature.geometry.type === "Point"
        ? (feature.geometry.coordinates as [number, number])
        : event.lngLat;

    tooltip.remove();
    popup.setLngLat(lngLat).setHTML(String(properties.popup ?? "")).addTo(map);

    setActiveState(activeId, false);
    activeId = feature.id ?? null;
    setActiveState(activeId, true);

    if (onPopupAction) {
      const button = popup
        .getElement()
        ?.querySelector<HTMLButtonElement>("[data-popup-action]");
      button?.addEventListener("click", () => onPopupAction(properties, popup));
    }
  };
  const onPopupClose = () => {
    setActiveState(activeId, false);
    activeId = null;
  };

  for (const layerId of layerIds) {
    map.on("mousemove", layerId, onMove);
    map.on("mouseleave", layerId, onLeave);
    map.on("click", layerId, onClick);
  }
  popup.on("close", onPopupClose);

  return () => {
    for (const layerId of layerIds) {
      map.off("mousemove", layerId, onMove);
      map.off("mouseleave", layerId, onLeave);
      map.off("click", layerId, onClick);
    }
    tooltip.remove();
    popup.remove();
  };
}

/**
 * Convenience for the common single circle-layer case (sensor map, location
 * map): hover ring + tooltip + click popup on one layer/source. Returns a cleanup
 * that tears down both bindings.
 */
export function bindInteractiveCircleLayer(
  map: maplibregl.Map,
  options: {
    sourceId: string;
    layerId: string;
    popupClassName?: string;
    tooltipClassName?: string;
    onPopupAction?: (properties: InteractiveFeatureProperties, popup: maplibregl.Popup) => void;
  },
): () => void {
  const unbindHoverState = bindCircleHoverState(map, {
    sourceId: options.sourceId,
    layerId: options.layerId,
  });
  const unbindPopups = bindFeaturePopups(map, {
    layerIds: [options.layerId],
    activeSourceId: options.sourceId,
    popupClassName: options.popupClassName,
    tooltipClassName: options.tooltipClassName,
    onPopupAction: options.onPopupAction,
  });
  return () => {
    unbindHoverState();
    unbindPopups();
  };
}
