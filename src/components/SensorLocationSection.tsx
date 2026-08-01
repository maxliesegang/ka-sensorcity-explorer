import type { Feature } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import { KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

import { fetchSensors } from "../api/sensorcity";
import { getCategoryColor, categoryLabelKey } from "../config/layers";
import {
  addBuildingExtrusionLayer,
  DEFAULT_MAP_ZOOM,
  KARLSRUHE_CENTER,
} from "../config/basemap";
import { useAsync } from "../hooks/useAsync";
import { useInitialMapView } from "../hooks/useInitialMapView";
import { useMapLibreMap } from "../hooks/useMapLibreMap";
import type { Sensor } from "../types";
import { DataFreshness } from "./DataFreshness";
import { formatReadingTime } from "../utils/format";
import { escapeHtml } from "../utils/html";
import {
  addLayerIfMissing,
  createPointFeature,
  extendLngLatBounds,
  upsertGeoJsonSource,
  type LngLatBounds,
  type LngLatTuple,
} from "../utils/maplibreGeoJson";
import {
  bindInteractiveCircleLayer,
  createInteractiveCirclePaint,
  type InteractiveCircleStyle,
} from "../utils/maplibreMarkers";
import { formatPrimaryReadingLine } from "../utils/sensorMeasurements";

const SENSOR_SOURCE_ID = "sensor-locations";
const SENSOR_LAYER_ID = "sensor-locations-circle";
const SENSOR_ZOOM = 16;

// The selected sensor gets the `highlight` ring (dark, larger); the rest stay small.
const MARKER_STYLE: InteractiveCircleStyle = {
  default: { radius: 5, strokeWidth: 1 },
  hovered: { radius: 7, strokeWidth: 2 },
  active: { radius: 8, strokeWidth: 3 },
  highlighted: { radius: 10, strokeWidth: 3 },
};

function getSensorCoordinates(sensor: Sensor): LngLatTuple | null {
  return sensor.lat != null && sensor.lon != null ? [sensor.lon, sensor.lat] : null;
}

function mergeSelectedSensor(sensor: Sensor, sensors: Sensor[] | null | undefined): Sensor[] {
  if (!sensors) return [sensor];
  return sensors.some((item) => item.objectId === sensor.objectId)
    ? sensors
    : [sensor, ...sensors];
}

/** Compact all-sensors map focused on the current sensor location. */
export function SensorLocationSection({ sensor }: { sensor: Sensor }) {
  const { t } = useTranslation("detail");
  const { t: tc } = useTranslation("common");
  const sensors = useAsync(fetchSensors, [], { reloadOnFocus: true });
  const { containerRef, mapRef, isStyleReady } = useMapLibreMap();
  const sensorBoundsRef = useRef<LngLatBounds | null>(null);
  const [renderedSensorCount, setRenderedSensorCount] = useState(0);

  const selectedSensorCoordinates = useMemo(
    () => getSensorCoordinates(sensor),
    [sensor.lat, sensor.lon],
  );
  const mapSensors = useMemo(
    () => mergeSelectedSensor(sensor, sensors.data),
    [sensor, sensors.data],
  );

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

  // Populate markers whenever the data or its labels change. Deliberately does
  // not touch the viewport: this effect also re-runs on a language or theme
  // switch, and neither is a reason to undo the viewer's pan/zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleReady) return;

    const features: Feature[] = [];
    let bounds: LngLatBounds | null = null;

    // Draw the selected sensor last so it renders on top of its neighbours.
    const ordered = [...mapSensors].sort((a, b) =>
      a.objectId === sensor.objectId ? 1 : b.objectId === sensor.objectId ? -1 : 0,
    );
    for (const item of ordered) {
      const coordinates = getSensorCoordinates(item);
      if (!coordinates) continue;
      const isSelected = item.objectId === sensor.objectId;
      const color = getCategoryColor(item.category);
      const label = tc(categoryLabelKey(item.category));
      features.push(
        createPointFeature(coordinates[0], coordinates[1], item.objectId, {
          color,
          isHighlighted: isSelected,
          tooltip: `${item.name} - ${label}`,
          popup: buildLocationPopupHtml(item, label, isSelected, t, tc),
        }),
      );
      bounds = extendLngLatBounds(bounds, coordinates);
    }

    upsertGeoJsonSource(map, SENSOR_SOURCE_ID, features);
    sensorBoundsRef.current = bounds;
    setRenderedSensorCount(features.length);
  }, [isStyleReady, mapRef, mapSensors, sensor.objectId, t, tc]);

  // The sensor is this map's context, so navigating to a different one re-centres
  // — but nothing else does. "Focus sensor" is the way back afterwards.
  useInitialMapView(sensor.objectId, () => {
    const map = mapRef.current;
    if (!map || !isStyleReady) return false;

    if (selectedSensorCoordinates) {
      map.jumpTo({ center: selectedSensorCoordinates, zoom: SENSOR_ZOOM });
      return true;
    }
    // A sensor the feed gives no position for: show its neighbours instead, once
    // they load. Until then the map keeps its Karlsruhe starting view.
    const bounds = sensorBoundsRef.current;
    if (!bounds) return false;
    map.fitBounds(bounds, { padding: 24, maxZoom: 14, animate: false });
    return true;
  });

  function focusSensor() {
    const map = mapRef.current;
    if (!map || !selectedSensorCoordinates) return;
    map.flyTo({ center: selectedSensorCoordinates, zoom: SENSOR_ZOOM });
  }

  function fitAllSensors() {
    const map = mapRef.current;
    if (!map) return;
    if (sensorBoundsRef.current) {
      map.fitBounds(sensorBoundsRef.current, { padding: 24, maxZoom: 14 });
    } else {
      map.flyTo({ center: KARLSRUHE_CENTER, zoom: DEFAULT_MAP_ZOOM });
    }
  }

  const status = sensors.loading
    ? t("location.status.loading")
    : sensors.error
      ? t("location.status.error")
      : t("location.status.showing", { count: renderedSensorCount });

  return (
    <section className="sensor-detail__section sensor-detail__section--plain sensor-location">
      <div className="section-toolbar sensor-location__toolbar">
        <div>
          <h2 className="kern-heading-small">{t("location.heading")}</h2>
          <p className="kern-body kern-body--small kern-body--muted">
            {selectedSensorCoordinates ? t("location.subtitle") : t("location.noCoordinates")}
          </p>
        </div>
        <div className="sensor-location__actions">
          <KernButton
            type="button"
            variant="secondary"
            className="kern-btn--small"
            onClick={focusSensor}
            disabled={!selectedSensorCoordinates}
            icon="home"
            label={t("location.focusSensor")}
          />
          <KernButton
            type="button"
            variant="tertiary"
            className="kern-btn--small"
            onClick={fitAllSensors}
            icon="visibility"
            label={t("location.fitAll")}
          />
        </div>
      </div>
      <div className="result-bar result-bar--compact" role="status" aria-live="polite">
        <span className="kern-body kern-body--small">{status}</span>
        <DataFreshness state={sensors} />
      </div>
      <div
        className="map sensor-location__map"
        ref={containerRef}
        role="region"
        aria-label={t("location.mapAria", { name: sensor.name })}
      />
    </section>
  );
}

function buildLocationPopupHtml(
  sensor: Sensor,
  label: string,
  isSelected: boolean,
  translate: (key: string) => string,
  translateCommon: (key: string) => string,
): string {
  const navigationContent = isSelected
    ? escapeHtml(translate("location.popup.currentSensor"))
    : `<a href="#/sensor/${sensor.objectId}">${escapeHtml(
        translate("location.popup.viewDetails"),
      )}</a>`;

  return `
    <strong>${escapeHtml(sensor.name)}</strong><br/>
    ${escapeHtml(label)}<br/>
    ${escapeHtml(formatPrimaryReadingLine(sensor, translateCommon))}<br/>
    ${
      sensor.measuredAt != null
        ? `${escapeHtml(formatReadingTime(sensor.measuredAt))}<br/>`
        : ""
    }
    ${navigationContent}
  `;
}
