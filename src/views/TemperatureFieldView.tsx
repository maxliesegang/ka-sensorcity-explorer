// Temperature field of live weather/air sensors, drawn as nearest-sensor
// (Thiessen / Voronoi) regions: each cell is filled with its sensor's colour so
// hotter and colder parts of the city read at a glance. The source sensors are
// drawn above as coloured markers. The colour scale is anchored to the current
// readings so warm areas never read as blue. Mirrors MapView's Leaflet lifecycle
// (create-once, invalidateSize, teardown) and KERN view-header markup.
//
// Shares its colour scale, baseline/deviation model and legend with the combined
// community view via useTemperatureFieldModel.

import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { KernBadge, KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { fetchSensors } from "../api/sensorcity";
import { fetchTemperatureInsights } from "../api/temperatureInsights";
import { categoryLabelKey, TEMPERATURE_CATEGORY_KEY } from "../config/layers";
import { AsyncBoundary } from "../components/Status";
import { TemperatureLegend } from "../components/TemperatureLegend";
import {
  TemperatureInsights,
  TemperatureLiveStats,
} from "../components/TemperatureInsights";
import { useAsync } from "../hooks/useAsync";
import { useLeafletMap } from "../hooks/useLeafletMap";
import {
  bindPopupAction,
  createMarkerInteractions,
  SENSOR_POPUP_OPTIONS,
  SENSOR_TOOLTIP_OPTIONS,
  sensorPopupHtml,
  type MarkerInteractionStyles,
} from "../utils/leafletMarkers";
import {
  clearTemperatureFieldLayers,
  drawTemperatureField,
  fitTemperatureFieldToPoints,
} from "../utils/leafletTemperatureField";
import { TemperatureBaselineControls } from "../components/TemperatureBaselineControls";
import { useTemperatureFieldModel } from "../hooks/useTemperatureFieldModel";
import { formatSignedDelta, formatTime, formatValue } from "../utils/format";
import {
  summarizeLiveTemperatureReadings,
  getLiveTemperatureReadings,
  getLiveTemperatureFieldPoints,
  type LiveTemperatureFieldPoint,
} from "../utils/liveTemperatureReadings";

const UNIT = "°C";

// Resting/hover/active ring sizes for the temperature point markers (smaller
// than the sensor map's, as they sit atop the coloured Voronoi field). `rest`
// must match the marker style drawn in drawTemperatureField so resetting on
// mouse-out/close is seamless.
const MARKER_STYLES: MarkerInteractionStyles = {
  rest: { radius: 5, weight: 1, color: "#fff" },
  hover: { radius: 8, weight: 2 },
  active: { radius: 9, weight: 3 },
};

export function TemperatureFieldView() {
  const sensors = useAsync(fetchSensors, []);
  const [showInsights, setShowInsights] = useState(false);
  const insights = useAsync(fetchTemperatureInsights, [], { enabled: showInsights });
  const { t } = useTranslation("temperature");
  const { t: tc } = useTranslation("common");

  // Field group (Voronoi polygons) is created first so it sits under the markers.
  const { containerRef, mapRef, groupsRef } = useLeafletMap(["field", "markers"]);

  const [shownCount, setShownCount] = useState(0);

  const temperaturePoints = useMemo(
    () => (sensors.data ? getLiveTemperatureFieldPoints(sensors.data) : []),
    [sensors.data],
  );
  const liveTemperatureReadings = useMemo(
    () => (sensors.data ? getLiveTemperatureReadings(sensors.data) : []),
    [sensors.data],
  );
  const liveTemperatureSummary = useMemo(
    () => summarizeLiveTemperatureReadings(liveTemperatureReadings),
    [liveTemperatureReadings],
  );
  const baselineReadings = useMemo(
    () =>
      liveTemperatureReadings.map(({ sensor, temperature }) => ({
        id: String(sensor.objectId),
        label: sensor.name,
        temperature,
      })),
    [liveTemperatureReadings],
  );

  const {
    mode,
    setMode,
    baselineId,
    setBaselineId,
    showLabels,
    setShowLabels,
    baselineOptions,
    baselineLabel,
    isDwdBaselineSelected,
    isDeviationMapActive,
    isBaselineTemperatureUnavailable,
    dwdBaselineError,
    dwdBaselineObservation,
    temperatureScale,
    legend,
    colorFor,
    labelFor,
  } = useTemperatureFieldModel(temperaturePoints, baselineReadings);

  // Re-render the region polygons + markers whenever the sensor data changes.
  useEffect(() => {
    const map = mapRef.current;
    const field = groupsRef.current.field;
    const markers = groupsRef.current.markers;
    if (!map || !field || !markers) return;

    if (temperaturePoints.length === 0 || !temperatureScale) {
      clearTemperatureFieldLayers(field, markers);
      setShownCount(0);
      return;
    }

    const temperatureCategoryLabel = tc(categoryLabelKey(TEMPERATURE_CATEGORY_KEY));
    const attachInteractions = createMarkerInteractions(MARKER_STYLES);

    /** Bind the shared sensor tooltip + popup to a Leaflet layer. */
    function bindSensor(layer: L.Layer, point: LiveTemperatureFieldPoint): void {
      const sensorId = String(point.sensor.objectId);
      // Hide the "set as reference" button when this sensor is already the
      // active deviation baseline (it's the highlighted marker).
      const isCurrentBaseline = mode === "deviation" && baselineId === sensorId;
      layer
        .bindTooltip(
          `${point.sensor.name} — ${point.temperature.toFixed(1)} °C`,
          SENSOR_TOOLTIP_OPTIONS,
        )
        .bindPopup(
          sensorPopupHtml({
            color: colorFor(point.temperature),
            label: temperatureCategoryLabel,
            name: point.sensor.name,
            meta: `${point.temperature.toFixed(1)} °C`,
            readingTime: point.sensor.measuredAt,
            href: `#/sensor/${point.sensor.objectId}`,
            cta: t("popup.viewDetails"),
            action: isCurrentBaseline ? undefined : { label: t("popup.setReference") },
          }),
          SENSOR_POPUP_OPTIONS,
        );

      // Wire the "set as reference" button: switch to deviation mode anchored on
      // this sensor.
      if (!isCurrentBaseline) {
        bindPopupAction(layer, () => {
          setMode("deviation");
          setBaselineId(sensorId);
          layer.closePopup();
        });
      }

      // Hover/active affordance on the point markers only — the Voronoi cells
      // share the same popup but shouldn't resize.
      if (layer instanceof L.CircleMarker) attachInteractions(layer);
    }

    drawTemperatureField({
      map,
      field,
      markers,
      points: temperaturePoints,
      color: (point) => colorFor(point.temperature),
      bindLayer: bindSensor,
      label: showLabels ? (point) => labelFor(point.temperature) : undefined,
      fitBounds: false,
      highlight: (point) =>
        mode === "deviation" && String(point.sensor.objectId) === baselineId,
    });

    setShownCount(temperaturePoints.length);
  }, [temperaturePoints, temperatureScale, t, tc, baselineId, mode, setMode, setBaselineId, showLabels, colorFor, labelFor]);

  // Fit the view to the sensors only when the data itself changes — not on every
  // redraw (e.g. toggling labels or switching colour mode), so those leave the
  // current pan/zoom untouched.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || temperaturePoints.length === 0) return;
    fitTemperatureFieldToPoints(map, temperaturePoints);
  }, [temperaturePoints]);

  // Keep the map sized correctly across loading/data transitions.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(id);
  }, [sensors.loading, sensors.error, shownCount]);

  const mapStatus = sensors.loading
    ? t("status.loading")
    : sensors.error
      ? t("status.error")
      : isDeviationMapActive
        ? t("baseline.status", {
            name: baselineLabel,
            count: shownCount,
          })
        : temperatureScale
        ? t("status.showingRange", {
            count: shownCount,
            min: temperatureScale.min.toFixed(1),
            max: temperatureScale.max.toFixed(1),
          })
        : t("status.showing", { count: shownCount });

  return (
    <div>
      <div className="view-header view-header--compact">
        <div className="view-header__lead">
          <KernBadge label={t("badge")} variant="info" />
          <h1 className="kern-heading-large">{t("heading")}</h1>
        </div>
        <p className="kern-body kern-body--muted view-header__intro">
          {t("intro")} {t("introLinkPrefix")}
          <Link className="kern-link" to="/map">
            {t("introLink")}
          </Link>
          .
        </p>
      </div>

      <section className="map-shell" aria-label={t("canvasAria")}>
        <TemperatureBaselineControls
          id="city-temperature-baseline-controls-select"
          mode={mode}
          onModeChange={setMode}
          baselineId={baselineId}
          onBaselineChange={setBaselineId}
          options={baselineOptions}
          modeLabel={t("baseline.modeLabel")}
          modeAbsoluteLabel={t("baseline.modeAbsolute")}
          modeDeviationLabel={t("baseline.modeDeviation")}
          baselineSelectLabel={t("baseline.selectLabel")}
          showLabels={showLabels}
          onShowLabelsChange={setShowLabels}
          showLabelsLabel={t("baseline.showLabels")}
        />

        <div className="result-bar result-bar--compact" role="status" aria-live="polite">
          <span className="kern-body kern-body--small">{mapStatus}</span>
          {isDeviationMapActive && dwdBaselineObservation && (
            <span className="kern-body kern-body--small kern-body--muted">
              {t("baseline.dwdReading", {
                value: formatValue(dwdBaselineObservation.temperature, UNIT),
                time: formatTime(dwdBaselineObservation.timestamp),
              })}
            </span>
          )}
          {isBaselineTemperatureUnavailable && (
            <span className="kern-body kern-body--small kern-body--muted">
              {isDwdBaselineSelected && dwdBaselineError
                ? dwdBaselineError
                : t("baseline.unavailable")}
            </span>
          )}
        </div>

        <div
          className="map"
          ref={containerRef}
          role="application"
          aria-label={t("mapAria")}
        />

        <AsyncBoundary
          state={sensors}
          isEmpty={(data) => getLiveTemperatureFieldPoints(data).length === 0}
          emptyLabel={t("emptyToMap")}
        >
          {() =>
            legend?.kind === "deviation" ? (
              <TemperatureLegend
                gradient={legend.gradient}
                minLabel={formatSignedDelta(legend.min, UNIT)}
                midLabel="0 °C"
                midPos={legend.zeroPos}
                maxLabel={formatSignedDelta(legend.max, UNIT)}
                caption={t("baseline.legendCaption", { name: baselineLabel })}
              />
            ) : legend?.kind === "absolute" ? (
              <TemperatureLegend
                gradient={legend.gradient}
                minLabel={formatValue(legend.min, UNIT)}
                maxLabel={formatValue(legend.max, UNIT)}
                caption={t("legend.caption", { count: legend.count })}
              />
            ) : null
          }
        </AsyncBoundary>
      </section>

      <section className="temp-insights-shell" aria-label={t("insights.live.heading")}>
        <AsyncBoundary
          state={sensors}
          isEmpty={(data) => getLiveTemperatureReadings(data).length === 0}
          emptyLabel={t("insights.empty")}
        >
          {() => (
            <TemperatureLiveStats
              current={liveTemperatureSummary}
              sensorCount={liveTemperatureReadings.length}
            />
          )}
        </AsyncBoundary>
      </section>

      <section className="temp-insights-shell" aria-label={t("insights.heading")}>
        {showInsights ? (
          <AsyncBoundary
            state={insights}
            isEmpty={(data) => data.sensorCount === 0}
            emptyLabel={t("insights.empty")}
          >
            {(data) => <TemperatureInsights insights={data} />}
          </AsyncBoundary>
        ) : (
          <div className="temp-insights-cta">
            <h2 className="kern-heading-large">{t("insights.heading")}</h2>
            <p className="kern-body kern-body--muted">{t("insights.cta.hint")}</p>
            <KernButton
              type="button"
              variant="primary"
              onClick={() => setShowInsights(true)}
              label={t("insights.cta.button")}
            />
          </div>
        )}
      </section>
    </div>
  );
}
