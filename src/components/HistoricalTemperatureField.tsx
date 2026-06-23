import type L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  ArchivedTemperatureFieldPoint,
  TemperatureFieldSnapshot,
} from "../api/temperatureInsights";
import { DWD_BASELINE_ID, getBaselineLabel } from "../config/temperatureBaselines";
import { useAsync } from "../hooks/useAsync";
import { useLeafletMap } from "../hooks/useLeafletMap";
import { useTemperatureBaselineSelection } from "../hooks/useTemperatureBaselineSelection";
import {
  useTemperatureFieldLabelVisibility,
  formatTemperatureLabel,
  formatTemperatureDeviationLabel,
} from "../hooks/useTemperatureFieldLabels";
import {
  formatReadingTime,
  formatSignedDelta,
  formatTime,
  formatTimestamp,
  formatValue,
} from "../utils/format";
import { escapeHtml } from "../utils/html";
import {
  clearTemperatureFieldLayers,
  drawTemperatureField,
  fitTemperatureFieldToPoints,
} from "../utils/leafletTemperatureField";
import { buildTemperatureScale } from "../utils/temperatureScale";
import {
  buildAbsoluteTemperatureLegend,
  buildDeviationTemperatureLegend,
  buildBaselineDeviationScale,
  buildTemperatureBaselineOptions,
  resolveBaselineTemperature,
  type TemperatureBaselineReading,
} from "../utils/temperatureFieldModel";
import { TemperatureLegend } from "./TemperatureLegend";
import { TemperatureBaselineControls } from "./TemperatureBaselineControls";
import {
  fetchRheinstetterHourly,
  nearestPoint,
  observedOnly,
} from "../api/brightsky";

interface Props {
  snapshots: TemperatureFieldSnapshot[];
  bucketHours: number;
  onSelectedTimeChange?: (time: number | null) => void;
}

const UNIT = "°C";

function toBaselineReading(point: ArchivedTemperatureFieldPoint): TemperatureBaselineReading {
  return {
    id: String(point.objectId),
    label: point.name,
    temperature: point.temperature,
  };
}

export function HistoricalTemperatureField({
  snapshots,
  bucketHours,
  onSelectedTimeChange,
}: Props) {
  const { t } = useTranslation("temperature");
  const { containerRef, mapRef, groupsRef } = useLeafletMap(["field", "markers"]);
  const latestIndex = Math.max(0, snapshots.length - 1);
  const [selectedIndex, setSelectedIndex] = useState(latestIndex);

  useEffect(() => {
    setSelectedIndex(latestIndex);
  }, [latestIndex]);

  const selectedSnapshot = snapshots[selectedIndex] ?? null;
  const selectedTime = selectedSnapshot?.timestamp ?? null;

  useEffect(() => {
    onSelectedTimeChange?.(selectedTime);
  }, [onSelectedTimeChange, selectedTime]);

  const allSnapshotPoints = useMemo(
    () => snapshots.flatMap((snapshot) => snapshot.points),
    [snapshots],
  );
  const temperatureScale = useMemo(
    () => (selectedSnapshot ? buildTemperatureScale(selectedSnapshot.points) : null),
    [selectedSnapshot],
  );
  const replayBaselineReadings = useMemo(
    () => allSnapshotPoints.map(toBaselineReading),
    [allSnapshotPoints],
  );
  const selectedBaselineReadings = useMemo(
    () => selectedSnapshot?.points.map(toBaselineReading) ?? [],
    [selectedSnapshot],
  );

  // All temperature sensors present across the replay, plus DWD.
  const baselineOptions = useMemo(
    () =>
      buildTemperatureBaselineOptions(replayBaselineReadings, {
        dwd: t("baseline.dwdOption"),
        average: t("baseline.averageOption"),
      }),
    [replayBaselineReadings, t],
  );

  const { mode, setMode, baselineId, setBaselineId } =
    useTemperatureBaselineSelection(baselineOptions);

  // Opt-in per-cell value labels, persisted (shared with the live map). Off by
  // default since they can crowd the map.
  const [showLabels, setShowLabels] = useTemperatureFieldLabelVisibility();

  // DWD baseline for the full replay range — fetched once in DWD deviation mode.
  const isDwdBaselineSelected = mode === "deviation" && baselineId === DWD_BASELINE_ID;
  const firstSnapshotTime = snapshots.length > 0 ? snapshots[0].timestamp : 0;
  const lastSnapshotTime = snapshots.length > 0 ? snapshots[snapshots.length - 1].timestamp : 0;
  const dwdBaseline = useAsync(
    (signal) =>
      fetchRheinstetterHourly(new Date(firstSnapshotTime), new Date(lastSnapshotTime), signal),
    [firstSnapshotTime, lastSnapshotTime],
    { enabled: isDwdBaselineSelected },
  );

  const baselineLabel = useMemo(
    () => getBaselineLabel(baselineOptions, baselineId),
    [baselineOptions, baselineId],
  );

  const dwdBaselineObservation = useMemo(() => {
    if (!isDwdBaselineSelected || !selectedSnapshot) return null;
    return nearestPoint(observedOnly(dwdBaseline.data ?? []), selectedSnapshot.timestamp);
  }, [isDwdBaselineSelected, dwdBaseline.data, selectedSnapshot]);

  // Baseline temperature for the currently selected snapshot.
  const baselineTemperature = useMemo(
    () =>
      resolveBaselineTemperature({
        mode,
        baselineId,
        readings: selectedBaselineReadings,
        // Match against real observations only — never a forecast-padded hour
        // near the tail of the archive window.
        dwdTemperature: dwdBaselineObservation?.temperature,
      }),
    [mode, baselineId, selectedBaselineReadings, dwdBaselineObservation],
  );

  const isDeviationMapActive = mode === "deviation" && baselineTemperature != null;
  const isBaselineTemperatureUnavailable = mode === "deviation" && baselineTemperature == null;

  const baselineDeviationScale = useMemo(
    () =>
      isDeviationMapActive && selectedSnapshot
        ? buildBaselineDeviationScale(selectedSnapshot.points, baselineTemperature)
        : null,
    [isDeviationMapActive, selectedSnapshot, baselineTemperature],
  );

  useEffect(() => {
    const map = mapRef.current;
    const field = groupsRef.current.field;
    const markers = groupsRef.current.markers;
    if (!map || !field || !markers) return;

    if (!selectedSnapshot || !temperatureScale) {
      clearTemperatureFieldLayers(field, markers);
      return;
    }

    function bindPoint(layer: L.Layer, point: ArchivedTemperatureFieldPoint): void {
      const value = formatValue(point.temperature, UNIT);
      layer
        .bindTooltip(`${point.name}: ${value}`)
        .bindPopup(
          `<strong>${escapeHtml(point.name)}</strong><br/>` +
            `${value}<br/>` +
            `${escapeHtml(formatReadingTime(selectedSnapshot.timestamp))}<br/>` +
            `<a href="#/sensor/${point.objectId}">${escapeHtml(t("popup.viewDetails"))}</a>`,
        );
    }

    if (baselineDeviationScale && baselineTemperature != null) {
      drawTemperatureField({
        map,
        field,
        markers,
        points: selectedSnapshot.points,
        color: (point) => baselineDeviationScale.css(point.temperature - baselineTemperature),
        bindLayer: bindPoint,
        label: showLabels
          ? (point) => formatTemperatureDeviationLabel(point.temperature - baselineTemperature)
          : undefined,
        fitBounds: false,
        highlight: (point) => String(point.objectId) === baselineId,
      });
      return;
    }

    drawTemperatureField({
      map,
      field,
      markers,
      points: selectedSnapshot.points,
      color: (point) => temperatureScale.css(point.temperature),
      bindLayer: bindPoint,
      label: showLabels ? (point) => formatTemperatureLabel(point.temperature) : undefined,
      fitBounds: false,
    });
  }, [
    selectedSnapshot,
    temperatureScale,
    t,
    baselineDeviationScale,
    baselineTemperature,
    baselineId,
    showLabels,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = window.setTimeout(() => {
      map.invalidateSize();
      fitTemperatureFieldToPoints(map, allSnapshotPoints);
    }, 0);
    return () => window.clearTimeout(id);
  }, [allSnapshotPoints]);

  const legend = useMemo(() => {
    if (!temperatureScale || !selectedSnapshot) return null;
    return baselineDeviationScale
      ? buildDeviationTemperatureLegend(baselineDeviationScale)
      : buildAbsoluteTemperatureLegend(temperatureScale, selectedSnapshot.points.length);
  }, [temperatureScale, selectedSnapshot, baselineDeviationScale]);

  if (snapshots.length === 0 || !selectedSnapshot) {
    return (
      <section className="historical-temperature-field" aria-labelledby="historical-temperature-field-heading">
        <h3 id="historical-temperature-field-heading" className="kern-heading-small">
          {t("insights.historyMap.heading")}
        </h3>
        <p className="kern-body kern-body--muted">
          {t("insights.historyMap.empty")}
        </p>
      </section>
    );
  }

  return (
    <section className="historical-temperature-field" aria-labelledby="historical-temperature-field-heading">
      <div className="section-toolbar">
        <div>
          <h3 id="historical-temperature-field-heading" className="kern-heading-small">
            {t("insights.historyMap.heading")}
          </h3>
          <p className="kern-body kern-body--small kern-body--muted">
            {t("insights.historyMap.intro", { hours: bucketHours })}
          </p>
        </div>
        <span className="kern-body kern-body--small">
          {formatTimestamp(selectedSnapshot.timestamp)}
        </span>
      </div>

      <div className="map-shell historical-temperature-field__shell">
        <TemperatureBaselineControls
          id="historical-temperature-baseline-controls-select"
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
          <span className="kern-body kern-body--small">
            {isDeviationMapActive
              ? t("insights.historyMap.baselineStatus", {
                  date: formatTimestamp(selectedSnapshot.timestamp),
                  name: baselineLabel,
                  count: selectedSnapshot.points.length,
                })
              : t("insights.historyMap.status", {
                  date: formatTimestamp(selectedSnapshot.timestamp),
                  count: selectedSnapshot.points.length,
                  min: formatValue(temperatureScale?.min, UNIT),
                  max: formatValue(temperatureScale?.max, UNIT),
                })}
          </span>
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
              {isDwdBaselineSelected && dwdBaseline.error
                ? dwdBaseline.error
                : t("baseline.unavailable")}
            </span>
          )}
        </div>

        <div
          className="map historical-temperature-field__map"
          ref={containerRef}
          role="application"
          aria-label={t("insights.historyMap.mapAria")}
        />

        <div className="historical-temperature-field__controls">
          <label className="kern-label" htmlFor="historical-temperature-field-slider">
            {t("insights.historyMap.sliderLabel")}
          </label>
          <input
            id="historical-temperature-field-slider"
            className="historical-temperature-field__slider"
            type="range"
            min={0}
            max={snapshots.length - 1}
            step={1}
            value={selectedIndex}
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            aria-valuetext={formatTimestamp(selectedSnapshot.timestamp)}
          />
          <div className="historical-temperature-field__range-labels">
            <span className="kern-body kern-body--small">
              {formatTimestamp(snapshots[0].timestamp)}
            </span>
            <span className="kern-body kern-body--small">
              {formatTimestamp(snapshots[snapshots.length - 1].timestamp)}
            </span>
          </div>
        </div>

        {legend &&
          (legend.kind === "deviation" ? (
            <TemperatureLegend
              gradient={legend.gradient}
              minLabel={formatSignedDelta(legend.min, UNIT)}
              midLabel="0 °C"
              midPos={legend.zeroPos}
              maxLabel={formatSignedDelta(legend.max, UNIT)}
              caption={t("baseline.legendCaption", { name: baselineLabel })}
            />
          ) : (
            <TemperatureLegend
              gradient={legend.gradient}
              minLabel={formatValue(legend.min, UNIT)}
              maxLabel={formatValue(legend.max, UNIT)}
              caption={t("insights.historyMap.legendCaption", {
                count: legend.count,
                hours: bucketHours,
              })}
            />
          ))}
      </div>
    </section>
  );
}
