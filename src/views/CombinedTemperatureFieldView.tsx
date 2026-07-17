// Combined temperature field: SensorCity's own network plus community readings
// (openSenseMap and sensor.community) around Karlsruhe, drawn as one
// nearest-sensor (Voronoi) field.
//
// This is a sibling of TemperatureFieldView — both share the colour scale,
// baseline/deviation model and legend via useTemperatureFieldModel — but its
// points come from several sources (see combineTemperaturePoints) and it is
// intentionally hidden from the nav while the community-data blend is evaluated.

import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { KernBadge } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { fetchSensors } from "../api/sensorcity";
import { fetchOpenSenseMapTemperatures } from "../api/opensensemap";
import { fetchSensorCommunityTemperatures } from "../api/sensorcommunity";
import { AsyncBoundary } from "../components/Status";
import { TemperatureLegend } from "../components/TemperatureLegend";
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
import { getLiveTemperatureFieldPoints } from "../utils/liveTemperatureReadings";
import {
  combineTemperaturePoints,
  type CombinedTemperaturePoint,
  type TemperatureProvider,
} from "../utils/combinedTemperatureField";

const UNIT = "°C";

// Resting/hover/active ring sizes for the point markers — matches the sibling
// temperature view so the two maps read identically.
const MARKER_STYLES: MarkerInteractionStyles = {
  rest: { radius: 5, weight: 1, color: "#fff" },
  hover: { radius: 8, weight: 2 },
  active: { radius: 9, weight: 3 },
};

export function CombinedTemperatureFieldView() {
  const sensors = useAsync(fetchSensors, []);
  const openSenseMap = useAsync(fetchOpenSenseMapTemperatures, []);
  const sensorCommunity = useAsync(fetchSensorCommunityTemperatures, []);
  const { t } = useTranslation("temperature");

  // Field group (Voronoi polygons) is created first so it sits under the markers.
  const { containerRef, mapRef, groupsRef } = useLeafletMap(["field", "markers"]);

  const [shownCount, setShownCount] = useState(0);

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
  } = useTemperatureFieldModel(combinedPoints, baselineReadings);

  // Re-render the region polygons + markers whenever the combined data changes.
  useEffect(() => {
    const map = mapRef.current;
    const field = groupsRef.current.field;
    const markers = groupsRef.current.markers;
    if (!map || !field || !markers) return;

    if (combinedPoints.length === 0 || !temperatureScale) {
      clearTemperatureFieldLayers(field, markers);
      setShownCount(0);
      return;
    }

    const attachInteractions = createMarkerInteractions(MARKER_STYLES);

    /** Bind the shared sensor tooltip + popup to a Leaflet layer. */
    function bindPoint(layer: L.Layer, point: CombinedTemperaturePoint): void {
      const providerLabel = t(`combined.provider.${point.provider}`);
      // Hide the "set as reference" button when this point is already the active
      // deviation baseline (it's the highlighted marker).
      const isCurrentBaseline = mode === "deviation" && baselineId === point.id;
      // The link is dropped (helper-side) when neither href nor cta is set, e.g.
      // sensor.community devices that have no public per-sensor page.
      const href = point.detailHref ?? point.externalHref;
      const cta = href
        ? point.detailHref
          ? t("popup.viewDetails")
          : t("combined.viewOnProvider", { provider: providerLabel })
        : undefined;

      layer
        .bindTooltip(
          `${point.name} — ${point.temperature.toFixed(1)} °C`,
          SENSOR_TOOLTIP_OPTIONS,
        )
        .bindPopup(
          sensorPopupHtml({
            color: colorFor(point.temperature),
            label: providerLabel,
            name: point.name,
            meta: `${point.temperature.toFixed(1)} °C`,
            readingTime: point.measuredAt,
            href,
            cta,
            action: isCurrentBaseline ? undefined : { label: t("popup.setReference") },
          }),
          SENSOR_POPUP_OPTIONS,
        );

      if (!isCurrentBaseline) {
        bindPopupAction(layer, () => {
          setMode("deviation");
          setBaselineId(point.id);
          layer.closePopup();
        });
      }

      if (layer instanceof L.CircleMarker) attachInteractions(layer);
    }

    drawTemperatureField({
      map,
      field,
      markers,
      points: combinedPoints,
      color: (point) => colorFor(point.temperature),
      bindLayer: bindPoint,
      label: showLabels ? (point) => labelFor(point.temperature) : undefined,
      fitBounds: false,
      highlight: (point) => mode === "deviation" && point.id === baselineId,
    });

    setShownCount(combinedPoints.length);
  }, [combinedPoints, temperatureScale, t, baselineId, mode, setMode, setBaselineId, showLabels, colorFor, labelFor]);

  // Fit the view to the points only when the data itself changes — not on every
  // redraw (toggling labels, switching colour mode), so those leave the current
  // pan/zoom untouched.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || combinedPoints.length === 0) return;
    fitTemperatureFieldToPoints(map, combinedPoints);
  }, [combinedPoints]);

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
        ? t("baseline.status", { name: baselineLabel, count: shownCount })
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
          <KernBadge label={t("combined.badge")} variant="info" />
          <h1 className="kern-heading-large">{t("combined.heading")}</h1>
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
          id="combined-temperature-baseline-controls-select"
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
          isEmpty={() => combinedPoints.length === 0}
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

        <p className="kern-body kern-body--small kern-body--muted">
          {t("combined.attribution")}
        </p>
      </section>
    </div>
  );
}
