// Combined temperature field: SensorCity's own network plus community readings
// (openSenseMap and sensor.community) around Karlsruhe, drawn as one
// nearest-sensor (Voronoi) field.
//
// This is a sibling of TemperatureFieldView — both share the colour scale,
// baseline/deviation model and legend via useTemperatureFieldModel — but its
// points come from several sources (see combineTemperaturePoints) and it is
// intentionally hidden from the nav while the community-data blend is evaluated.

import { useEffect, useMemo, useState } from "react";
import { KernBadge } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { fetchSensors } from "../api/sensorcity";
import { fetchOpenSenseMapTemperatures } from "../api/opensensemap";
import { fetchSensorCommunityTemperatures } from "../api/sensorcommunity";
import { AsyncBoundary } from "../components/Status";
import {
  TemperatureBaselineStatus,
  TemperatureFieldLegend,
} from "../components/TemperatureFieldIndicators";
import { useAsync } from "../hooks/useAsync";
import { useMapLibreMap } from "../hooks/useMapLibreMap";
import { useTemperatureFieldController } from "../hooks/useTemperatureFieldController";
import { buildSensorPopupHtml } from "../utils/maplibreMarkers";
import { TemperatureBaselineControls } from "../components/TemperatureBaselineControls";
import { useTemperatureFieldModel } from "../hooks/useTemperatureFieldModel";
import { getLiveTemperatureFieldPoints } from "../utils/liveTemperatureReadings";
import {
  combineTemperaturePoints,
  type TemperatureProvider,
} from "../utils/combinedTemperatureField";

export function CombinedTemperatureFieldView() {
  const sensors = useAsync(fetchSensors, []);
  const openSenseMap = useAsync(fetchOpenSenseMapTemperatures, []);
  const sensorCommunity = useAsync(fetchSensorCommunityTemperatures, []);
  const { t } = useTranslation("temperature");

  const mapHandle = useMapLibreMap();
  const { containerRef, isStyleReady } = mapHandle;

  const [mappedPointCount, setMappedPointCount] = useState(0);

  const sensorCityPoints = useMemo(
    () => (sensors.data ? getLiveTemperatureFieldPoints(sensors.data) : []),
    [sensors.data],
  );
  const combinedPoints = useMemo(
    () =>
      combineTemperaturePoints(sensorCityPoints, [
        {
          provider: "opensensemap",
          idPrefix: "osm",
          readings: openSenseMap.data ?? [],
          hrefFor: (id) => `https://opensensemap.org/explore/${id}`,
        },
        {
          provider: "sensorcommunity",
          idPrefix: "sc",
          readings: sensorCommunity.data ?? [],
        },
      ]),
    [sensorCityPoints, openSenseMap.data, sensorCommunity.data],
  );
  // Keyed by the provider union rather than by hand-written names, so adding a
  // provider is a compile error here instead of a silent miscount.
  const providerCounts = useMemo(() => {
    const counts: Record<TemperatureProvider, number> = {
      sensorcity: 0,
      opensensemap: 0,
      sensorcommunity: 0,
    };
    for (const point of combinedPoints) counts[point.provider]++;
    return counts;
  }, [combinedPoints]);

  const baselineReadings = useMemo(
    () =>
      combinedPoints.map((point) => ({
        id: point.id,
        label: point.name,
        temperature: point.temperature,
      })),
    [combinedPoints],
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
  } = useTemperatureFieldModel(combinedPoints, baselineReadings);

  // The "set as reference" popup action only needs the clicked point's id (carried
  // in feature properties) plus the model's stable setters.
  const fieldControllerRef = useTemperatureFieldController(
    mapHandle,
    {
      popupClassName: "sensor-popup",
      tooltipClassName: "sensor-tooltip",
      onPopupAction: (properties, popup) => {
        setDisplayMode("deviation");
        setBaselineId(String(properties.pointId));
        popup.remove();
      },
    },
    combinedPoints,
  );

  // Re-render the region polygons + markers whenever the combined data changes.
  useEffect(() => {
    const fieldController = fieldControllerRef.current;
    if (!fieldController) return;

    if (combinedPoints.length === 0 || !adaptiveTemperatureScale) {
      fieldController.clear();
      setMappedPointCount(0);
      return;
    }

    fieldController.render({
      points: combinedPoints,
      getId: (point) => point.id,
      getColor: (point) => getColorForTemperature(point.temperature),
      getTooltipText: (point) => `${point.name} — ${point.temperature.toFixed(1)} °C`,
      getPopupHtml: (point) => {
        const providerLabel = t(`combined.provider.${point.provider}`);
        // Hide the "set as reference" button when this point is already the active
        // deviation baseline (it's the highlighted marker).
        const isCurrentBaseline =
          displayMode === "deviation" && baselineId === point.id;
        // The link is dropped when neither an href nor a link label is set, e.g.
        // sensor.community devices that have no public per-sensor page.
        const href = point.detailHref ?? point.externalHref;
        const linkLabel = href
          ? point.detailHref
            ? t("popup.viewDetails")
            : t("combined.viewOnProvider", { provider: providerLabel })
          : undefined;
        return buildSensorPopupHtml({
          color: getColorForTemperature(point.temperature),
          label: providerLabel,
          name: point.name,
          readingSummary: `${point.temperature.toFixed(1)} °C`,
          readingTime: point.measuredAt,
          href,
          linkLabel,
          secondaryAction: isCurrentBaseline
            ? undefined
            : { label: t("popup.setReference") },
        });
      },
      getLabel: showLabels
        ? (point) => formatLabelForTemperature(point.temperature)
        : undefined,
      isHighlighted: (point) =>
        displayMode === "deviation" && point.id === baselineId,
      getProperties: (point) => ({ pointId: point.id }),
    });

    setMappedPointCount(combinedPoints.length);
  }, [
    isStyleReady,
    fieldControllerRef,
    combinedPoints,
    adaptiveTemperatureScale,
    t,
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
        ? t("baseline.status", { name: baselineLabel, count: mappedPointCount })
        : adaptiveTemperatureScale
          ? t("status.showingRange", {
              count: mappedPointCount,
              min: adaptiveTemperatureScale.min.toFixed(1),
              max: adaptiveTemperatureScale.max.toFixed(1),
            })
          : t("status.showing", { count: mappedPointCount });

  return (
    <div>
      <div className="view-header view-header--compact">
        <div className="view-header__lead">
          <KernBadge label={t("combined.badge")} variant="info" />
          <h1 className="kern-heading-medium">{t("combined.heading")}</h1>
        </div>
        <p className="kern-body kern-body--muted view-header__intro">
          {t("combined.intro")} {t("combined.introLinkPrefix")}
          <Link className="kern-link" to="/temperature">
            {t("combined.introLink")}
          </Link>
          .
        </p>
      </div>

      <section className="map-shell" aria-label={t("canvasAria")}>
        <TemperatureBaselineControls
          baselineSelectId="combined-temperature-baseline-controls-select"
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
          {!sensors.loading && !sensors.error && (
            <span className="kern-body kern-body--small kern-body--muted">
              {/* Counts are keyed by provider, which is exactly the set of
                  interpolation params the breakdown string expects. */}
              {t("combined.providerBreakdown", providerCounts)}
            </span>
          )}
          {(openSenseMap.error || sensorCommunity.error) && (
            <span className="kern-body kern-body--small kern-body--muted">
              {t("combined.communityUnavailable")}
            </span>
          )}
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
          isEmpty={() => combinedPoints.length === 0}
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

        <p className="kern-body kern-body--small kern-body--muted">
          {t("combined.attribution")}
        </p>
      </section>
    </div>
  );
}
