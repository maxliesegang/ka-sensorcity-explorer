// Interactive Leaflet map of live sensors, coloured by category, with a
// toggleable category filter. Uses the raw Leaflet API (no react-leaflet):
// the map is created once and a single layer group is cleared/repopulated as
// the sensor data and filters change.

import L from "leaflet";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { KernBadge, KernButton, KernIcon } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { fetchSensors } from "../api/sensorcity";
import { AsyncBoundary } from "../components/Status";
import {
  CATEGORIES,
  categoryColor,
  categoryLabelKey,
} from "../config/layers";
import { useAsync } from "../hooks/useAsync";
import { DEFAULT_ZOOM, KARLSRUHE, useLeafletMap } from "../hooks/useLeafletMap";
import { timeAgo } from "../utils/format";
import {
  createMarkerInteractions,
  SENSOR_POPUP_OPTIONS,
  SENSOR_TOOLTIP_OPTIONS,
  sensorPopupHtml,
  type MarkerInteractionStyles,
} from "../utils/leafletMarkers";

// Resting/hover/active ring sizes for the category markers.
const MARKER_STYLES: MarkerInteractionStyles = {
  rest: { radius: 7, weight: 2, color: "#fff" },
  hover: { radius: 10, weight: 3 },
  active: { radius: 11, weight: 4 },
};

export function MapView() {
  const sensors = useAsync(fetchSensors, []);
  const [params] = useSearchParams();
  const { t } = useTranslation("map");
  const { t: tc } = useTranslation("common");

  // Optional ?category= deep-link pre-selects a single category.
  const initialCategory = params.get("category");
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      CATEGORIES.map((category) => [
        category.key,
        initialCategory ? category.key === initialCategory : true,
      ]),
    ),
  );

  const { containerRef, mapRef, groupsRef } = useLeafletMap(["markers"]);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const hasFittedInitialViewRef = useRef(false);
  const [shownCount, setShownCount] = useState(0);

  // Repopulate markers whenever the sensor data or the active filters change.
  useEffect(() => {
    const group = groupsRef.current.markers;
    if (!group) return;

    group.clearLayers();
    boundsRef.current = null;
    const data = sensors.data;
    if (!data) return;

    const attachInteractions = createMarkerInteractions(MARKER_STYLES);

    let count = 0;
    const bounds = L.latLngBounds([]);
    for (const sensor of data) {
      if (sensor.lat == null || sensor.lon == null) continue;
      if (!visibleCategories[sensor.category]) continue;

      const latLng: L.LatLngTuple = [sensor.lat, sensor.lon];
      const color = categoryColor(sensor.category);
      const label = tc(categoryLabelKey(sensor.category));
      const marker = L.circleMarker(latLng, {
        ...MARKER_STYLES.rest,
        fillColor: color,
        fillOpacity: 0.9,
        className: "sensor-marker",
      })
        .bindTooltip(`${sensor.name} — ${label}`, SENSOR_TOOLTIP_OPTIONS)
        .bindPopup(
          sensorPopupHtml({
            color,
            label,
            name: sensor.name,
            meta: `${t("popup.lastReading")} ${timeAgo(sensor.measuredAt)}`,
            href: `#/sensor/${sensor.objectId}`,
            cta: t("popup.viewDetails"),
          }),
          SENSOR_POPUP_OPTIONS,
        )
        .addTo(group);

      // While its popup is open the ring is drawn in the category colour.
      attachInteractions(marker, color);

      bounds.extend(latLng);
      count++;
    }

    boundsRef.current = count > 0 ? bounds : null;
    if (count > 0 && mapRef.current && !hasFittedInitialViewRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
      hasFittedInitialViewRef.current = true;
    }
    setShownCount(count);
  }, [sensors.data, visibleCategories, t, tc]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const id = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);
    return () => window.clearTimeout(id);
  }, [sensors.loading, sensors.error, shownCount, visibleCategories]);

  function toggleCategoryVisibility(categoryKey: string) {
    setVisibleCategories((currentVisibility) => ({
      ...currentVisibility,
      [categoryKey]: !currentVisibility[categoryKey],
    }));
  }

  function setAllCategoriesVisible(value: boolean) {
    setVisibleCategories(
      Object.fromEntries(CATEGORIES.map((category) => [category.key, value])),
    );
  }

  function showOnlyCategory(categoryKey: string) {
    setVisibleCategories(
      Object.fromEntries(
        CATEGORIES.map((category) => [category.key, category.key === categoryKey]),
      ),
    );
  }

  function resetView() {
    const map = mapRef.current;
    if (!map) return;
    map.invalidateSize();
    if (boundsRef.current) {
      map.fitBounds(boundsRef.current, { padding: [24, 24], maxZoom: 14 });
    } else {
      map.setView(KARLSRUHE, DEFAULT_ZOOM);
    }
  }

  const allCategoriesVisible = useMemo(
    () => CATEGORIES.every((category) => visibleCategories[category.key]),
    [visibleCategories],
  );
  const visibleCategoryCount = CATEGORIES.filter(
    (category) => visibleCategories[category.key],
  ).length;
  const mapStatus = sensors.loading
    ? t("status.loading")
    : sensors.error
      ? t("status.error")
      : t("status.showing", { count: shownCount });

  return (
    <div>
      <div className="view-header view-header--wide">
        <KernBadge label={t("badge")} variant="info" />
        <h1 className="kern-heading-large">{t("heading")}</h1>
        <p className="kern-body kern-body--muted">
          {t("intro")} {t("introLinkPrefix")}
          <Link className="kern-link" to="/sensors">
            {t("introLink")}
          </Link>
          .
        </p>
      </div>

      <section className="map-shell" aria-label={t("controlsAria")}>
        <div className="map-toolbar">
          <div className="map-toolbar__summary">
            <span className="map-toolbar__metric">{shownCount}</span>
            <span className="kern-body kern-body--small">{t("visibleSensors")}</span>
          </div>
          <div className="map-toolbar__meta">
            <span className="kern-body kern-body--small">
              {t("categoriesActive", {
                enabled: visibleCategoryCount,
                total: CATEGORIES.length,
              })}
            </span>
            {sensors.data && (
              <span className="kern-body kern-body--small">
                {t("liveSensorsLoaded", { count: sensors.data.length })}
              </span>
            )}
          </div>
          <div className="map-actions">
            <KernButton
              type="button"
              variant="secondary"
              className="kern-btn--small"
              onClick={resetView}
              icon="home"
              label={t("fitSensors")}
            />
            <KernButton
              type="button"
              variant="tertiary"
              className="kern-btn--small"
              onClick={() => setAllCategoriesVisible(!allCategoriesVisible)}
              label={allCategoriesVisible ? t("clearAll") : t("selectAll")}
            />
          </div>
        </div>

        <AsyncBoundary
          state={sensors}
          isEmpty={(data) => data.length === 0}
          emptyLabel={t("emptyToMap")}
        >
          {(data) => {
            const categoryCounts = new Map<string, number>();
            for (const sensor of data) {
              if (sensor.lat == null || sensor.lon == null) continue;
              categoryCounts.set(
                sensor.category,
                (categoryCounts.get(sensor.category) ?? 0) + 1,
              );
            }

            return (
              <fieldset className="map-filters">
                <legend className="kern-label map-filters__legend">
                  {t("filtersLegend")}
                </legend>
                <div className="map-filter-grid">
                  {CATEGORIES.map((category) => {
                    const label = tc(categoryLabelKey(category.key));
                    const isVisible = visibleCategories[category.key] ?? false;
                    const count = categoryCounts.get(category.key) ?? 0;

                    return (
                      <div
                        className={`map-filter${isVisible ? " map-filter--active" : ""}`}
                        key={category.key}
                        style={{ "--category-color": category.color } as CSSProperties}
                      >
                        <button
                          type="button"
                          className="map-filter__toggle"
                          aria-pressed={isVisible}
                          onClick={() => toggleCategoryVisibility(category.key)}
                        >
                          <span className="cat-dot" aria-hidden="true" />
                          <span className="map-filter__label">{label}</span>
                          <span
                            className="map-filter__count"
                            aria-label={t("status.showing", { count })}
                          >
                            {count}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="map-filter__only"
                          aria-label={t("onlyAria", { category: label })}
                          title={t("onlyAria", { category: label })}
                          onClick={() => showOnlyCategory(category.key)}
                        >
                          <KernIcon icon="visibility" size="small" />
                          <span className="map-filter__only-text">{t("only")}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            );
          }}
        </AsyncBoundary>

        <div className="result-bar result-bar--compact" role="status" aria-live="polite">
          <span className="kern-body kern-body--small">{mapStatus}</span>
        </div>
        <div
          className="map"
          ref={containerRef}
          role="application"
          aria-label={t("mapAria")}
        />
      </section>

      <ul className="map-legend" aria-label={t("legendAria")}>
        {CATEGORIES.map((category) => (
          <li className="legend-item" key={category.key}>
            <span
              className="cat-dot"
              style={{ background: category.color }}
              aria-hidden="true"
            />
            {tc(categoryLabelKey(category.key))}
          </li>
        ))}
      </ul>
    </div>
  );
}
