// Interactive MapLibre map of live sensors, coloured by category, with a
// toggleable category filter. The map is created once (via useMapLibreMap); a
// single GeoJSON source is repopulated as the sensor data and filters change,
// and the circle layer's colour comes straight from each feature's properties.

import type { Feature } from "geojson";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { KernBadge, KernButton, KernIcon } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { fetchSensors } from "../api/sensorcity";
import { AsyncBoundary } from "../components/Status";
import { CollapsibleFilters } from "../components/CollapsibleFilters";
import {
  CATEGORIES,
  getCategoryColor,
  categoryLabelKey,
} from "../config/layers";
import {
  addBuildingExtrusionLayer,
  DEFAULT_MAP_ZOOM,
  KARLSRUHE_CENTER,
} from "../config/basemap";
import { useAsync } from "../hooks/useAsync";
import { useMapLibreMap } from "../hooks/useMapLibreMap";
import {
  addLayerIfMissing,
  createPointFeature,
  extendLngLatBounds,
  upsertGeoJsonSource,
  type LngLatBounds,
} from "../utils/maplibreGeoJson";
import {
  bindInteractiveCircleLayer,
  createInteractiveCirclePaint,
  buildSensorPopupHtml,
  type InteractiveCircleStyle,
} from "../utils/maplibreMarkers";
import { formatPrimaryReadingLine } from "../utils/sensorMeasurements";

const SENSOR_SOURCE_ID = "sensors";
const SENSOR_LAYER_ID = "sensors-circle";

// Resting/hover/active ring sizes for the category markers.
const MARKER_STYLE: InteractiveCircleStyle = {
  default: { radius: 7, strokeWidth: 2 },
  hovered: { radius: 10, strokeWidth: 3 },
  active: { radius: 11, strokeWidth: 4 },
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

  const { containerRef, mapRef, isStyleReady } = useMapLibreMap();
  const visibleSensorBoundsRef = useRef<LngLatBounds | null>(null);
  const hasFittedInitialViewRef = useRef(false);
  const [visibleSensorCount, setVisibleSensorCount] = useState(0);

  // Create the circle layer + interactions once the style is ready (and again
  // after a theme swap, which resets `isStyleReady`).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleReady) return;
    addBuildingExtrusionLayer(map);
    upsertGeoJsonSource(map, SENSOR_SOURCE_ID, []);
    addLayerIfMissing(map, {
      id: SENSOR_LAYER_ID,
      type: "circle",
      source: SENSOR_SOURCE_ID,
      paint: createInteractiveCirclePaint(MARKER_STYLE),
    });
    return bindInteractiveCircleLayer(map, {
      sourceId: SENSOR_SOURCE_ID,
      layerId: SENSOR_LAYER_ID,
      popupClassName: "sensor-popup",
      tooltipClassName: "sensor-tooltip",
    });
  }, [isStyleReady, mapRef]);

  // Repopulate markers whenever the sensor data or the active filters change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleReady) return;

    const features: Feature[] = [];
    let bounds: LngLatBounds | null = null;

    for (const sensor of sensors.data ?? []) {
      if (sensor.lat == null || sensor.lon == null) continue;
      if (!visibleCategories[sensor.category]) continue;

      const color = getCategoryColor(sensor.category);
      const label = tc(categoryLabelKey(sensor.category));
      features.push(
        createPointFeature(sensor.lon, sensor.lat, sensor.objectId, {
          color,
          tooltip: `${sensor.name} — ${label}`,
          popup: buildSensorPopupHtml({
            color,
            label,
            name: sensor.name,
            readingSummary: formatPrimaryReadingLine(sensor, tc),
            readingTime: sensor.measuredAt,
            href: `#/sensor/${sensor.objectId}`,
            linkLabel: t("popup.viewDetails"),
          }),
        }),
      );
      bounds = extendLngLatBounds(bounds, [sensor.lon, sensor.lat]);
    }

    upsertGeoJsonSource(map, SENSOR_SOURCE_ID, features);
    visibleSensorBoundsRef.current = bounds;
    if (bounds && !hasFittedInitialViewRef.current) {
      map.fitBounds(bounds, { padding: 24, maxZoom: 14, animate: false });
      hasFittedInitialViewRef.current = true;
    }
    setVisibleSensorCount(features.length);
  }, [isStyleReady, mapRef, sensors.data, visibleCategories, t, tc]);

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
    if (visibleSensorBoundsRef.current) {
      map.fitBounds(visibleSensorBoundsRef.current, { padding: 24, maxZoom: 14 });
    } else {
      map.flyTo({ center: KARLSRUHE_CENTER, zoom: DEFAULT_MAP_ZOOM });
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
      : t("status.showing", { count: visibleSensorCount });

  return (
    <div>
      <div className="view-header view-header--wide">
        <KernBadge label={t("badge")} variant="info" />
        <h1 className="kern-heading-medium">{t("heading")}</h1>
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
            <span className="map-toolbar__metric">{visibleSensorCount}</span>
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
              <CollapsibleFilters
                className="map-filter-disclosure"
                summaryLabel={t("filtersLegend")}
                summaryMeta={t("categoriesActive", {
                  enabled: visibleCategoryCount,
                  total: CATEGORIES.length,
                })}
              >
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
              </CollapsibleFilters>
            );
          }}
        </AsyncBoundary>

        <div className="result-bar result-bar--compact" role="status" aria-live="polite">
          <span className="kern-body kern-body--small">{mapStatus}</span>
        </div>
        <p id="sensor-map-help" className="map-help kern-body kern-body--small kern-body--muted">
          {t("mapHelp")} <Link className="kern-link" to="/sensors">{t("introLink")}</Link>.
        </p>
        <div
          className="map"
          ref={containerRef}
          role="region"
          aria-label={t("mapAria")}
          aria-describedby="sensor-map-help"
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
