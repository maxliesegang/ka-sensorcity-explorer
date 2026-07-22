// Temperature field of live weather/air sensors, drawn as nearest-sensor
// (Thiessen / Voronoi) regions: each cell is filled with its sensor's colour so
// hotter and colder parts of the city read at a glance. The source sensors are
// drawn above as coloured markers. The colour scale is anchored to the current
// readings so warm areas never read as blue. Mirrors MapView's MapLibre lifecycle
// (create-once, teardown) and KERN view-header markup.
//
// Shares its colour scale, baseline/deviation model and legend with the combined
// community view via useTemperatureFieldModel.

import { useEffect, useMemo, useState } from "react";
import { KernBadge, KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useBoolParam } from "../hooks/useUrlState";
import { fetchSensors } from "../api/sensorcity";
import { fetchTemperatureInsights } from "../api/temperatureInsights";
import { categoryLabelKey, TEMPERATURE_CATEGORY_KEY } from "../config/layers";
import { AsyncBoundary } from "../components/Status";
import {
  TemperatureBaselineStatus,
  TemperatureFieldLegend,
} from "../components/TemperatureFieldIndicators";
import {
  TemperatureInsights,
  TemperatureLiveStats,
} from "../components/TemperatureInsights";
import { useAsync } from "../hooks/useAsync";
import { useMapLibreMap } from "../hooks/useMapLibreMap";
import { useTemperatureFieldController } from "../hooks/useTemperatureFieldController";
import { buildSensorPopupHtml } from "../utils/maplibreMarkers";
import { TemperatureBaselineControls } from "../components/TemperatureBaselineControls";
import { useTemperatureFieldModel } from "../hooks/useTemperatureFieldModel";
import {
  summarizeLiveTemperatureReadings,
  getLiveTemperatureReadings,
  getLiveTemperatureFieldPoints,
  type LiveTemperatureFieldPoint,
} from "../utils/liveTemperatureReadings";

export function TemperatureFieldView() {
  const sensors = useAsync(fetchSensors, []);
  // The heavier insights section is opt-in and deep-linked (`?insights=1`), so a
  // shared link can land straight on the expanded analytics.
  const [showInsights, setShowInsights] = useBoolParam("insights", false);
  const insights = useAsync(fetchTemperatureInsights, [], { enabled: showInsights });
  const { t } = useTranslation("temperature");
  const { t: tc } = useTranslation("common");

  const mapHandle = useMapLibreMap();
  const { containerRef, isStyleReady } = mapHandle;

  const [mappedSensorCount, setMappedSensorCount] = useState(0);

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
    displayMode,
    setDisplayMode,
    baselineId,
    setBaselineId,
    showLabels,
    setShowLabels,
    baselineOptions,
    baselineLabel,
    isDwdBaselineSelected,
    isDeviationModeActive,
    isBaselineTemperatureUnavailable,
    dwdBaselineError,
    dwdBaselineObservation,
    adaptiveTemperatureScale,
    legendModel,
    getColorForTemperature,
    formatLabelForTemperature,
  } = useTemperatureFieldModel(temperaturePoints, baselineReadings);

  // The "set as reference" popup action only needs the clicked sensor's id
  // (carried in feature properties) plus the model's stable setters.
  const fieldControllerRef = useTemperatureFieldController(
    mapHandle,
    {
      popupClassName: "sensor-popup",
      tooltipClassName: "sensor-tooltip",
      onPopupAction: (properties, popup) => {
        setDisplayMode("deviation");
        setBaselineId(String(properties.objectId));
        popup.remove();
      },
    },
    temperaturePoints,
  );

  // Re-render the region polygons + markers whenever the sensor data or colour model
  // changes.
  useEffect(() => {
    const fieldController = fieldControllerRef.current;
    if (!fieldController) return;

    if (temperaturePoints.length === 0 || !adaptiveTemperatureScale) {
      fieldController.clear();
      setMappedSensorCount(0);
      return;
    }

    const temperatureCategoryLabel = tc(categoryLabelKey(TEMPERATURE_CATEGORY_KEY));

    fieldController.render<LiveTemperatureFieldPoint>({
      points: temperaturePoints,
      getId: (point) => point.sensor.objectId,
      getColor: (point) => getColorForTemperature(point.temperature),
      getTooltipText: (point) =>
        `${point.sensor.name} — ${point.temperature.toFixed(1)} °C`,
      getPopupHtml: (point) => {
        // Hide the "set as reference" button when this sensor is already the
        // active deviation baseline (it's the highlighted marker).
        const isCurrentBaseline =
          displayMode === "deviation" && baselineId === String(point.sensor.objectId);
        return buildSensorPopupHtml({
          color: getColorForTemperature(point.temperature),
          label: temperatureCategoryLabel,
          name: point.sensor.name,
          readingSummary: `${point.temperature.toFixed(1)} °C`,
          readingTime: point.sensor.measuredAt,
          href: `#/sensor/${point.sensor.objectId}`,
          linkLabel: t("popup.viewDetails"),
          secondaryAction: isCurrentBaseline
            ? undefined
            : { label: t("popup.setReference") },
        });
      },
      getLabel: showLabels
        ? (point) => formatLabelForTemperature(point.temperature)
        : undefined,
      isHighlighted: (point) =>
        displayMode === "deviation" && String(point.sensor.objectId) === baselineId,
      getProperties: (point) => ({ objectId: point.sensor.objectId }),
    });

    setMappedSensorCount(temperaturePoints.length);
  }, [
    isStyleReady,
    fieldControllerRef,
    temperaturePoints,
    adaptiveTemperatureScale,
    t,
    tc,
    baselineId,
    displayMode,
    showLabels,
    getColorForTemperature,
    formatLabelForTemperature,
  ]);

  const mapStatus = sensors.loading
    ? t("status.loading")
    : sensors.error
      ? t("status.error")
      : isDeviationModeActive
        ? t("baseline.status", {
            name: baselineLabel,
            count: mappedSensorCount,
          })
        : adaptiveTemperatureScale
        ? t("status.showingRange", {
            count: mappedSensorCount,
            min: adaptiveTemperatureScale.min.toFixed(1),
            max: adaptiveTemperatureScale.max.toFixed(1),
          })
        : t("status.showing", { count: mappedSensorCount });

  return (
    <div>
      <div className="view-header view-header--compact">
        <div className="view-header__lead">
          <KernBadge label={t("badge")} variant="info" />
          <h1 className="kern-heading-medium">{t("heading")}</h1>
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
          baselineSelectId="city-temperature-baseline-controls-select"
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          baselineId={baselineId}
          onBaselineIdChange={setBaselineId}
          baselineOptions={baselineOptions}
          displayModeLabel={t("baseline.displayModeLabel")}
          temperatureModeLabel={t("baseline.temperatureMode")}
          deviationModeLabel={t("baseline.deviationMode")}
          baselineSelectLabel={t("baseline.selectLabel")}
          showLabels={showLabels}
          onShowLabelsChange={setShowLabels}
          showLabelsLabel={t("baseline.showLabels")}
        />

        <div className="result-bar result-bar--compact" role="status" aria-live="polite">
          <span className="kern-body kern-body--small">{mapStatus}</span>
          <TemperatureBaselineStatus
            isDeviationModeActive={isDeviationModeActive}
            dwdBaselineObservation={dwdBaselineObservation}
            isBaselineTemperatureUnavailable={isBaselineTemperatureUnavailable}
            isDwdBaselineSelected={isDwdBaselineSelected}
            dwdBaselineError={dwdBaselineError}
          />
        </div>

        <div
          className="map"
          ref={containerRef}
          role="region"
          aria-label={t("mapAria")}
        />

        <AsyncBoundary
          state={sensors}
          isEmpty={(data) => getLiveTemperatureFieldPoints(data).length === 0}
          emptyLabel={t("emptyToMap")}
        >
          {() => (
            <TemperatureFieldLegend
              legend={legendModel}
              getTemperatureCaption={(count) => t("legend.caption", { count })}
              deviationCaption={t("baseline.legendCaption", { name: baselineLabel })}
            />
          )}
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
