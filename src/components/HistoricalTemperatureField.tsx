import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  HistoricalTemperatureFieldPoint,
  HistoricalTemperatureFieldFrame,
} from "../api/temperatureInsights";
import {
  fetchRheinstettenHourly,
  nearestPoint,
  observedOnly,
} from "../api/brightsky";
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
import { findTimelineStepIndex } from "../utils/timelineNavigation";
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
import { HistoricalTemperatureTimelineControls } from "./HistoricalTemperatureTimelineControls";

interface Props {
  frames: HistoricalTemperatureFieldFrame[];
  frameIntervalMinutes: number;
  onSelectedTimeChange?: (time: number | null) => void;
}

const TEMPERATURE_UNIT = "°C";
const MIN_COVERAGE_RATIO = 0.7;
// Playback advances one navigation step per tick; one second reads as an
// animation without racing past frames the eye can register.
const PLAYBACK_INTERVAL_MS = 1_000;

function toBaselineReading(point: HistoricalTemperatureFieldPoint): TemperatureBaselineReading {
  return {
    id: String(point.objectId),
    label: point.name,
    temperature: point.temperature,
  };
}

export function HistoricalTemperatureField({
  frames,
  frameIntervalMinutes,
  onSelectedTimeChange,
}: Props) {
  const { t } = useTranslation("temperature");
  const mapHandle = useMapLibreMap();
  const { containerRef, isStyleReady } = mapHandle;
  const latestFrameIndex = Math.max(0, frames.length - 1);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(latestFrameIndex);
  const [navigationStepMinutes, setNavigationStepMinutes] = useState(60);
  const [maxReadingAgeMinutes, setMaxReadingAgeMinutes] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  useEffect(() => {
    setSelectedFrameIndex(latestFrameIndex);
    setIsPlaying(false);
  }, [latestFrameIndex]);

  // Advance one navigation step per tick while playing, stopping at the latest
  // frame. Pressing play at the end restarts from the beginning (see togglePlay).
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setSelectedFrameIndex((current) => {
        if (current >= latestFrameIndex) return current;
        return findTimelineStepIndex(frames, current, navigationStepMinutes, 1);
      });
    }, PLAYBACK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPlaying, frames, navigationStepMinutes, latestFrameIndex]);

  // At the end of the timeline, either restart (loop) or stop.
  useEffect(() => {
    if (!isPlaying || selectedFrameIndex < latestFrameIndex) return;
    if (isLooping && latestFrameIndex > 0) {
      setSelectedFrameIndex(0);
    } else {
      setIsPlaying(false);
    }
  }, [isPlaying, isLooping, selectedFrameIndex, latestFrameIndex]);

  const togglePlay = () => {
    setIsPlaying((playing) => {
      if (!playing && selectedFrameIndex >= latestFrameIndex) {
        setSelectedFrameIndex(0);
      }
      return !playing;
    });
  };

  const unfilteredFrame = frames[selectedFrameIndex] ?? null;
  const selectedFrame = useMemo(
    () =>
      unfilteredFrame
        ? {
            ...unfilteredFrame,
            points: unfilteredFrame.points.filter(
              (point) =>
                unfilteredFrame.timestamp - point.observedAt <= maxReadingAgeMinutes * 60_000,
            ),
          }
        : null,
    [unfilteredFrame, maxReadingAgeMinutes],
  );
  const selectedTime = selectedFrame?.timestamp ?? null;

  useEffect(() => {
    onSelectedTimeChange?.(selectedTime);
  }, [onSelectedTimeChange, selectedTime]);

  const replaySensorPoints = useMemo(() => {
    const byId = new Map<number, HistoricalTemperatureFieldPoint>();
    for (const frame of frames) {
      for (const point of frame.points) byId.set(point.objectId, point);
    }
    return [...byId.values()];
  }, [frames]);
  const availableSensorCount = replaySensorPoints.length;
  const includedSensorCount = selectedFrame?.points.length ?? 0;
  const hasLowCoverage =
    availableSensorCount > 0 && includedSensorCount / availableSensorCount < MIN_COVERAGE_RATIO;
  const temperatureScale = useMemo(
    () =>
      selectedFrame && selectedFrame.points.length > 0
        ? buildTemperatureScale(selectedFrame.points)
        : null,
    [selectedFrame],
  );
  const replayBaselineReadings = useMemo(
    () => replaySensorPoints.map(toBaselineReading),
    [replaySensorPoints],
  );
  const selectedBaselineReadings = useMemo(
    () => selectedFrame?.points.map(toBaselineReading) ?? [],
    [selectedFrame],
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
  const firstFrameTime = frames.length > 0 ? frames[0].timestamp : 0;
  const lastFrameTime = frames.length > 0 ? frames[frames.length - 1].timestamp : 0;
  const dwdBaseline = useAsync(
    (signal) =>
      fetchRheinstettenHourly(new Date(firstFrameTime), new Date(lastFrameTime), signal),
    [firstFrameTime, lastFrameTime],
    { enabled: isDwdBaselineSelected },
  );

  const baselineLabel = useMemo(
    () => getBaselineLabel(baselineOptions, baselineId),
    [baselineOptions, baselineId],
  );

  const dwdBaselineObservation = useMemo(() => {
    if (!isDwdBaselineSelected || !selectedFrame) return null;
    return nearestPoint(observedOnly(dwdBaseline.data ?? []), selectedFrame.timestamp);
  }, [isDwdBaselineSelected, dwdBaseline.data, selectedFrame]);

  // Baseline temperature for the currently selected frame.
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
      isDeviationMapActive && selectedFrame
        ? buildBaselineDeviationScale(selectedFrame.points, baselineTemperature)
        : null,
    [isDeviationMapActive, selectedFrame, baselineTemperature],
  );

  // The replay map has no per-marker action, so no options beyond the shared
  // hover/popup styling.
  const fieldControllerRef = useTemperatureFieldController(
    mapHandle,
    { popupClassName: "sensor-popup", tooltipClassName: "sensor-tooltip" },
    replaySensorPoints,
  );

  useEffect(() => {
    const fieldController = fieldControllerRef.current;
    if (!fieldController) return;

    if (!selectedFrame || !temperatureScale) {
      fieldController.clear();
      return;
    }

    const frameTime = selectedFrame.timestamp;
    const readingAgeMinutes = (point: HistoricalTemperatureFieldPoint) =>
      Math.max(0, Math.round((frameTime - point.observedAt) / 60_000));
    const tooltip = (point: HistoricalTemperatureFieldPoint) =>
      `${point.name}: ${formatValue(point.temperature, TEMPERATURE_UNIT)} · ${t("insights.historyMap.readingAgeCompact", { count: readingAgeMinutes(point) })}`;
    const popup = (point: HistoricalTemperatureFieldPoint) => {
      const ageMinutes = readingAgeMinutes(point);
      return `<strong>${escapeHtml(point.name)}</strong><br/>` +
        `${formatValue(point.temperature, TEMPERATURE_UNIT)}<br/>` +
        `${escapeHtml(formatReadingTime(point.observedAt))}<br/>` +
        `${escapeHtml(t("insights.historyMap.readingAge", { count: ageMinutes }))}<br/>` +
        `<a href="#/sensor/${point.objectId}">${escapeHtml(t("popup.viewDetails"))}</a>`;
    };

    if (baselineDeviationScale && baselineTemperature != null) {
      fieldController.render<HistoricalTemperatureFieldPoint>({
        points: selectedFrame.points,
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
      points: selectedFrame.points,
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
    selectedFrame,
    temperatureScale,
    t,
    baselineDeviationScale,
    baselineTemperature,
    baselineId,
    showLabels,
    fieldControllerRef,
  ]);

  const legend = useMemo(() => {
    if (!temperatureScale || !selectedFrame) return null;
    return baselineDeviationScale
      ? buildDeviationTemperatureLegend(baselineDeviationScale)
      : buildAbsoluteTemperatureLegend(temperatureScale, selectedFrame.points.length);
  }, [temperatureScale, selectedFrame, baselineDeviationScale]);

  if (frames.length === 0 || !selectedFrame) {
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
            {t("insights.historyMap.intro", {
              interval:
                frameIntervalMinutes < 60
                  ? t("insights.historyMap.minutes", { count: frameIntervalMinutes })
                  : t("insights.historyMap.hours", { count: frameIntervalMinutes / 60 }),
            })}
          </p>
        </div>
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
            {includedSensorCount === 0
              ? t("insights.historyMap.noReadingsForFrame", {
                  date: formatTimestamp(selectedFrame.timestamp),
                  total: availableSensorCount,
                  minutes: maxReadingAgeMinutes,
                })
              : isDeviationMapActive
              ? t("insights.historyMap.baselineStatus", {
                  date: formatTimestamp(selectedFrame.timestamp),
                  name: baselineLabel,
                  count: includedSensorCount,
                  total: availableSensorCount,
                  minutes: maxReadingAgeMinutes,
                })
              : t("insights.historyMap.status", {
                  date: formatTimestamp(selectedFrame.timestamp),
                  count: includedSensorCount,
                  total: availableSensorCount,
                  minutes: maxReadingAgeMinutes,
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
        {hasLowCoverage && (
          <div className="historical-temperature-field__coverage-warning" role="note">
            <span aria-hidden="true">⚠</span>
            <span className="kern-body kern-body--small">
              {t("insights.historyMap.lowCoverage", {
                count: includedSensorCount,
                total: availableSensorCount,
              })}
            </span>
          </div>
        )}

        <div
          className="map historical-temperature-field__map"
          ref={containerRef}
          role="region"
          aria-label={t("insights.historyMap.mapAria")}
        />

        <HistoricalTemperatureTimelineControls
          frames={frames}
          selectedFrameIndex={selectedFrameIndex}
          navigationStepMinutes={navigationStepMinutes}
          maxReadingAgeMinutes={maxReadingAgeMinutes}
          isPlaying={isPlaying}
          isLooping={isLooping}
          onTogglePlay={togglePlay}
          onLoopingChange={setIsLooping}
          onSelectedFrameIndexChange={(index) => {
            // Manual navigation takes over from playback.
            setIsPlaying(false);
            setSelectedFrameIndex(index);
          }}
          onNavigationStepMinutesChange={setNavigationStepMinutes}
          onMaxReadingAgeMinutesChange={setMaxReadingAgeMinutes}
        />

        <TemperatureFieldLegend
          legend={legend}
          getAbsoluteCaption={(count) =>
            t("insights.historyMap.legendCaption", {
              count,
              minutes: maxReadingAgeMinutes,
            })
          }
          deviationCaption={t("baseline.legendCaption", { name: baselineLabel })}
        />
      </div>
    </section>
  );
}
