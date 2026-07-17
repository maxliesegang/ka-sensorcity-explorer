import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

import { fetchSensors } from "../api/sensorcity";
import { getCategoryColor, categoryLabelKey } from "../config/layers";
import { useAsync } from "../hooks/useAsync";
import { DEFAULT_ZOOM, KARLSRUHE, useLeafletMap } from "../hooks/useLeafletMap";
import type { Sensor } from "../types";
import { formatReadingTime } from "../utils/format";
import { escapeHtml } from "../utils/html";
import { formatPrimaryReadingLine } from "../utils/sensorMeasurements";

const SENSOR_ZOOM = 16;
const FIT_OPTIONS: L.FitBoundsOptions = { padding: [24, 24], maxZoom: 14 };

function sensorLatLng(sensor: Sensor): L.LatLngTuple | null {
  return sensor.lat != null && sensor.lon != null
    ? [sensor.lat, sensor.lon]
    : null;
}

function mergeSelectedSensor(
  sensor: Sensor,
  sensors: Sensor[] | null | undefined,
): Sensor[] {
  if (!sensors) return [sensor];
  return sensors.some((item) => item.objectId === sensor.objectId)
    ? sensors
    : [sensor, ...sensors];
}

/** Compact all-sensors map focused on the current sensor location. */
export function SensorLocationSection({ sensor }: { sensor: Sensor }) {
  const { t } = useTranslation("detail");
  const { t: tc } = useTranslation("common");
  const sensors = useAsync(fetchSensors, []);
  const { containerRef, mapRef, groupsRef } = useLeafletMap(["markers"]);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const [mappedCount, setMappedCount] = useState(0);

  const selectedLatLng = useMemo(
    () => sensorLatLng(sensor),
    [sensor.lat, sensor.lon],
  );
  const mapSensors = useMemo(
    () => mergeSelectedSensor(sensor, sensors.data),
    [sensor, sensors.data],
  );

  useEffect(() => {
    const group = groupsRef.current.markers;
    if (!group) return;

    group.clearLayers();
    boundsRef.current = null;

    const bounds = L.latLngBounds([]);
    let count = 0;

    for (const item of mapSensors) {
      const latLng = sensorLatLng(item);
      if (!latLng) continue;

      const isSelected = item.objectId === sensor.objectId;
      const color = getCategoryColor(item.category);
      const label = tc(categoryLabelKey(item.category));
      const marker = L.circleMarker(latLng, {
        radius: isSelected ? 10 : 5,
        color: isSelected ? "#131525" : color,
        fillColor: color,
        fillOpacity: isSelected ? 0.95 : 0.62,
        weight: isSelected ? 3 : 1,
      })
        .bindTooltip(`${escapeHtml(item.name)} - ${escapeHtml(label)}`)
        .bindPopup(renderPopup(item, label, isSelected, t, tc))
        .addTo(group);

      if (isSelected) marker.bringToFront();
      bounds.extend(latLng);
      count++;
    }

    boundsRef.current = count > 0 ? bounds : null;
    setMappedCount(count);
    resetMapView(mapRef.current, selectedLatLng, bounds, count);
  }, [groupsRef, mapRef, mapSensors, selectedLatLng, sensor.objectId, t, tc]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const id = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(id);
  }, [mapRef, mappedCount, sensors.loading, sensors.error]);

  function focusSensor() {
    const map = mapRef.current;
    if (!map || !selectedLatLng) return;
    map.invalidateSize();
    map.setView(selectedLatLng, SENSOR_ZOOM);
  }

  function fitAllSensors() {
    const map = mapRef.current;
    if (!map) return;

    map.invalidateSize();
    if (boundsRef.current) {
      map.fitBounds(boundsRef.current, FIT_OPTIONS);
    } else {
      map.setView(KARLSRUHE, DEFAULT_ZOOM);
    }
  }

  const status = sensors.loading
    ? t("location.status.loading")
    : sensors.error
      ? t("location.status.error")
      : t("location.status.showing", { count: mappedCount });

  return (
    <section className="sensor-detail__section sensor-detail__section--plain sensor-location">
      <div className="section-toolbar sensor-location__toolbar">
        <div>
          <h2 className="kern-heading-small">{t("location.heading")}</h2>
          <p className="kern-body kern-body--small kern-body--muted">
            {selectedLatLng
              ? t("location.subtitle")
              : t("location.noCoordinates")}
          </p>
        </div>
        <div className="sensor-location__actions">
          <KernButton
            type="button"
            variant="secondary"
            className="kern-btn--small"
            onClick={focusSensor}
            disabled={!selectedLatLng}
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
      </div>
      <div
        className="map sensor-location__map"
        ref={containerRef}
        role="application"
        aria-label={t("location.mapAria", { name: sensor.name })}
      />
    </section>
  );
}

function resetMapView(
  map: L.Map | null,
  selectedLatLng: L.LatLngTuple | null,
  bounds: L.LatLngBounds,
  count: number,
) {
  if (!map) return;

  map.invalidateSize();
  if (selectedLatLng) {
    map.setView(selectedLatLng, SENSOR_ZOOM, { animate: false });
  } else if (count > 0) {
    map.fitBounds(bounds, FIT_OPTIONS);
  } else {
    map.setView(KARLSRUHE, DEFAULT_ZOOM);
  }
}

function renderPopup(
  sensor: Sensor,
  label: string,
  isSelected: boolean,
  translate: (key: string) => string,
  translateCommon: (key: string) => string,
): string {
  const action = isSelected
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
    ${action}
  `;
}
