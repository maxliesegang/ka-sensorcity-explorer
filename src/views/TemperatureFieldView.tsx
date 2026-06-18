// Temperature field of live "Temperatur" sensors, drawn as nearest-sensor
// (Thiessen / Voronoi) regions: each cell is filled with its sensor's colour so
// hotter and colder parts of the city read at a glance. The source sensors are
// drawn above as coloured markers. The colour scale is anchored to the current
// readings so warm areas never read as blue. Mirrors MapView's Leaflet lifecycle
// (create-once, invalidateSize, teardown) and KERN view-header markup.

import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { KernBadge, KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { fetchSensors } from "../api/sensorcity";
import { fetchTemperatureInsights } from "../api/temperatureInsights";
import { categoryLabelKey } from "../config/layers";
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
import { buildTemperatureScale } from "../utils/temperatureScale";
import { TemperatureBaselineControls } from "../components/TemperatureBaselineControls";
import { DWD_BASELINE_ID, getBaselineLabel } from "../config/temperatureBaselines";
import {
  fetchRheinstetterCurrent,
  latestObservation,
} from "../api/brightsky";
import { useTemperatureBaselineSelection } from "../hooks/useTemperatureBaselineSelection";
import {
  useTemperatureFieldLabelVisibility,
  formatTemperatureLabel,
  formatTemperatureDeviationLabel,
} from "../hooks/useTemperatureFieldLabels";
import { formatSignedDelta, formatValue } from "../utils/format";
import {
  buildAbsoluteTemperatureLegend,
  buildDeviationTemperatureLegend,
  buildBaselineDeviationScale,
  buildTemperatureBaselineOptions,
  resolveBaselineTemperature,
} from "../utils/temperatureFieldModel";
import {
  summarizeLiveTemperatureObservations,
  getLiveTemperatureObservations,
  getLiveTemperatureFieldPoints,
  type LiveTemperatureFieldPoint,
} from "../utils/liveTemperatureObservations";

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
  const { t, i18n } = useTranslation("temperature");
  const { t: tc } = useTranslation("common");

  // Field group (Voronoi polygons) is created first so it sits under the markers.
  const { containerRef, mapRef, groupsRef } = useLeafletMap(["field", "markers"]);

  const [shownCount, setShownCount] = useState(0);

  const temperaturePoints = useMemo(
    () => (sensors.data ? getLiveTemperatureFieldPoints(sensors.data) : []),
    [sensors.data],
  );
  const liveTemperatureObservations = useMemo(
    () => (sensors.data ? getLiveTemperatureObservations(sensors.data) : []),
    [sensors.data],
  );
  const liveTemperatureSummary = useMemo(
    () => summarizeLiveTemperatureObservations(liveTemperatureObservations),
    [liveTemperatureObservations],
  );
  const temperatureScale = useMemo(
    () => (temperaturePoints.length > 0 ? buildTemperatureScale(temperaturePoints) : null),
    [temperaturePoints],
  );
  const baselineReadings = useMemo(
    () =>
      liveTemperatureObservations.map(({ sensor, temperature }) => ({
        id: String(sensor.objectId),
        label: sensor.name,
        temperature,
      })),
    [liveTemperatureObservations],
  );

  // All available SensorCity temperature sensors plus Rheinstetten from Bright
  // Sky's live endpoint. Avoid the hourly `/weather` endpoint here because it
  // includes forecast rows after the latest observation.
  const baselineOptions = useMemo(
    () =>
      buildTemperatureBaselineOptions(baselineReadings, {
        dwd: t("baseline.dwdOption"),
        average: t("baseline.averageOption"),
      }),
    [baselineReadings, t],
  );

  const { mode, setMode, baselineId, setBaselineId } =
    useTemperatureBaselineSelection(baselineOptions);

  // Per-cell value labels are an opt-in (they can crowd the map), persisted so
  // the choice survives reloads. Default off.
  const [showLabels, setShowLabels] = useTemperatureFieldLabelVisibility();

  const isDwdBaselineSelected = mode === "deviation" && baselineId === DWD_BASELINE_ID;
  const dwdBaseline = useAsync(fetchRheinstetterCurrent, [], {
    enabled: isDwdBaselineSelected,
  });

  // Resolve the baseline temperature + a human label for the active baseline.
  const baselineLabel = useMemo(
    () => getBaselineLabel(baselineOptions, baselineId),
    [baselineOptions, baselineId],
  );

  const dwdBaselineObservation = useMemo(
    () =>
      isDwdBaselineSelected && dwdBaseline.data
        ? latestObservation([dwdBaseline.data])
        : null,
    [isDwdBaselineSelected, dwdBaseline.data],
  );

  const baselineTemperature = useMemo(
    () =>
      resolveBaselineTemperature({
        mode,
        baselineId,
        readings: baselineReadings,
        dwdTemperature: dwdBaselineObservation?.temperature,
      }),
    [mode, baselineId, baselineReadings, dwdBaselineObservation],
  );

  const isDeviationMapActive = mode === "deviation" && baselineTemperature != null;
  // True when the user asked for deviation but no baseline reading resolved.
  const isBaselineTemperatureUnavailable = mode === "deviation" && baselineTemperature == null;
  const baselineDeviationScale = useMemo(
    () =>
      isDeviationMapActive
        ? buildBaselineDeviationScale(temperaturePoints, baselineTemperature)
        : null,
    [isDeviationMapActive, temperaturePoints, baselineTemperature],
  );
  const legend = useMemo(() => {
    if (!temperatureScale) return null;
    return baselineDeviationScale
      ? buildDeviationTemperatureLegend(baselineDeviationScale)
      : buildAbsoluteTemperatureLegend(temperatureScale, temperaturePoints.length);
  }, [temperatureScale, baselineDeviationScale, temperaturePoints.length]);

  // Re-render the region polygons + markers whenever the sensor data changes.
  useEffect(() => {
    const map = mapRef.current;
    const field = groupsRef.current.field;
    const markers = groupsRef.current.markers;
    if (!map || !field || !markers) return;

    const points = temperaturePoints;
    if (points.length === 0 || !temperatureScale) {
      clearTemperatureFieldLayers(field, markers);
      setShownCount(0);
      return;
    }

    const activeTemperatureScale = temperatureScale;
    const temperatureCategoryLabel = tc(categoryLabelKey("Temperatur"));
    const attachInteractions = createMarkerInteractions(MARKER_STYLES);

    // Deviation mode: colour each point by its difference from the baseline.
    if (baselineDeviationScale && baselineTemperature != null) {
      drawTemperatureField({
        map,
        field,
        markers,
        points,
        color: (point) => baselineDeviationScale.css(point.temperature - baselineTemperature),
        bindLayer: bindSensor,
        label: showLabels
          ? (point) => formatTemperatureDeviationLabel(point.temperature - baselineTemperature)
          : undefined,
        fitBounds: false,
        highlight: (point) => String(point.sensor.objectId) === baselineId,
      });
      setShownCount(points.length);
      return;
    }

    /** Bind the shared sensor tooltip + popup to a Leaflet layer. */
    function bindSensor(layer: L.Layer, point: LiveTemperatureFieldPoint): void {
      const color = activeTemperatureScale.css(point.temperature);
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
            color,
            label: temperatureCategoryLabel,
            name: point.sensor.name,
            meta: `${point.temperature.toFixed(1)} °C`,
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
      points,
      color: (point) => activeTemperatureScale.css(point.temperature),
      bindLayer: bindSensor,
      label: showLabels ? (point) => formatTemperatureLabel(point.temperature) : undefined,
      fitBounds: false,
    });

    setShownCount(points.length);
  }, [
    temperaturePoints,
    temperatureScale,
    t,
    tc,
    baselineDeviationScale,
    baselineTemperature,
    baselineId,
    mode,
    setMode,
    setBaselineId,
    showLabels,
  ]);

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
          id="live-temperature-baseline-controls-select"
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
                time: new Date(dwdBaselineObservation.timestamp).toLocaleTimeString(i18n.language, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </span>
          )}
          {isBaselineTemperatureUnavailable && (
            <span className="kern-body kern-body--small kern-body--muted">
              {isDwdBaselineSelected && dwdBaseline.error
                ? dwdBaseline.error
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
          isEmpty={(data) => getLiveTemperatureObservations(data).length === 0}
          emptyLabel={t("insights.empty")}
        >
          {() => (
            <TemperatureLiveStats
              current={liveTemperatureSummary}
              sensorCount={liveTemperatureObservations.length}
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
