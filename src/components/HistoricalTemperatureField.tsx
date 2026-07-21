import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  HistoricalTemperatureFieldPoint,
  TemperatureFieldSnapshot,
} from "../api/temperatureInsights";
import { DWD_BASELINE_ID, getBaselineLabel } from "../config/temperatureBaselines";
import { useAsync } from "../hooks/useAsync";
import { useMapLibreMap } from "../hooks/useMapLibreMap";
import { useTemperatureFieldController } from "../hooks/useTemperatureFieldController";
import { useTemperatureBaselineSelection } from "../hooks/useTemperatureBaselineSelection";
import {
  useTemperatureFieldLabelVisibility,
  formatTemperatureLabel,
  formatTemperatureDeviationLabel,
} from "../hooks/useTemperatureFieldLabels";
import {
  formatReadingTime,
  formatTimestamp,
  formatValue,
} from "../utils/format";
import { escapeHtml } from "../utils/html";
import { buildTemperatureScale } from "../utils/temperatureScale";
import {
  buildAbsoluteTemperatureLegend,
  buildDeviationTemperatureLegend,
  buildBaselineDeviationScale,
  buildTemperatureBaselineOptions,
  resolveBaselineTemperature,
  type TemperatureBaselineReading,
} from "../utils/temperatureFieldModel";
import {
  TemperatureBaselineStatus,
  TemperatureFieldLegend,
} from "./TemperatureFieldIndicators";
import { TemperatureBaselineControls } from "./TemperatureBaselineControls";
import {
  fetchRheinstettenHourly,
  nearestPoint,
  observedOnly,
} from "../api/brightsky";

interface Props {
  snapshots: TemperatureFieldSnapshot[];
  bucketHours: number;
  onSelectedTimeChange?: (time: number | null) => void;
}

const TEMPERATURE_UNIT = "°C";

function toBaselineReading(point: HistoricalTemperatureFieldPoint): TemperatureBaselineReading {
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
  const mapHandle = useMapLibreMap();
  const { containerRef, isStyleReady } = mapHandle;
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
      fetchRheinstettenHourly(new Date(firstSnapshotTime), new Date(lastSnapshotTime), signal),
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

  // The replay map has no per-marker action, so no options beyond the shared
  // hover/popup styling.
  const fieldControllerRef = useTemperatureFieldController(
    mapHandle,
    { popupClassName: "sensor-popup", tooltipClassName: "sensor-tooltip" },
    allSnapshotPoints,
  );

  useEffect(() => {
    const fieldController = fieldControllerRef.current;
    if (!fieldController) return;

    if (!selectedSnapshot || !temperatureScale) {
      fieldController.clear();
      return;
    }

    const snapshotTime = selectedSnapshot.timestamp;
    const tooltip = (point: HistoricalTemperatureFieldPoint) =>
      `${point.name}: ${formatValue(point.temperature, TEMPERATURE_UNIT)}`;
    const popup = (point: HistoricalTemperatureFieldPoint) =>
      `<strong>${escapeHtml(point.name)}</strong><br/>` +
      `${formatValue(point.temperature, TEMPERATURE_UNIT)}<br/>` +
      `${escapeHtml(formatReadingTime(snapshotTime))}<br/>` +
      `<a href="#/sensor/${point.objectId}">${escapeHtml(t("popup.viewDetails"))}</a>`;

    if (baselineDeviationScale && baselineTemperature != null) {
      fieldController.render<HistoricalTemperatureFieldPoint>({
        points: selectedSnapshot.points,
        getId: (point) => point.objectId,
        getColor: (point) =>
          baselineDeviationScale.css(point.temperature - baselineTemperature),
        getTooltipText: tooltip,
        getPopupHtml: popup,
        getLabel: showLabels
          ? (point) => formatTemperatureDeviationLabel(point.temperature - baselineTemperature)
          : undefined,
        isHighlighted: (point) => String(point.objectId) === baselineId,
      });
      return;
    }

    fieldController.render<HistoricalTemperatureFieldPoint>({
      points: selectedSnapshot.points,
      getId: (point) => point.objectId,
      getColor: (point) => temperatureScale.css(point.temperature),
      getTooltipText: tooltip,
      getPopupHtml: popup,
      getLabel: showLabels
        ? (point) => formatTemperatureLabel(point.temperature)
        : undefined,
    });
  }, [
    isStyleReady,
    selectedSnapshot,
    temperatureScale,
    t,
    baselineDeviationScale,
    baselineTemperature,
    baselineId,
    showLabels,
    fieldControllerRef,
  ]);

  const legend = useMemo(() => {
    if (!temperatureScale || !selectedSnapshot) return null;
    return baselineDeviationScale
      ? buildDeviationTemperatureLegend(baselineDeviationScale)
      : buildAbsoluteTemperatureLegend(temperatureScale, selectedSnapshot.points.length);
  }, [temperatureScale, selectedSnapshot, baselineDeviationScale]);

  if (snapshots.length === 0 || !selectedSnapshot) {
    return (
      <section
        className="historical-temperature-field"
        aria-labelledby="historical-temperature-field-heading"
      >
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
    <section
      className="historical-temperature-field"
      aria-labelledby="historical-temperature-field-heading"
    >
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
                min: formatValue(temperatureScale?.min, TEMPERATURE_UNIT),
                max: formatValue(temperatureScale?.max, TEMPERATURE_UNIT),
                })}
          </span>
          <TemperatureBaselineStatus
            isDeviationMapActive={isDeviationMapActive}
            dwdObservation={dwdBaselineObservation}
            isBaselineTemperatureUnavailable={isBaselineTemperatureUnavailable}
            isDwdBaselineSelected={isDwdBaselineSelected}
            dwdError={dwdBaseline.error}
          />
        </div>

        <div
          className="map historical-temperature-field__map"
          ref={containerRef}
          role="region"
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

        <TemperatureFieldLegend
          legend={legend}
          getAbsoluteCaption={(count) =>
            t("insights.historyMap.legendCaption", { count, hours: bucketHours })
          }
          deviationCaption={t("baseline.legendCaption", { name: baselineLabel })}
        />
      </div>
    </section>
  );
}
