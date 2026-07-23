import { KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

import type { HistoricalTemperatureFieldFrame } from "../api/temperatureInsights";
import { formatTimestamp } from "../utils/format";
import { findTimelineStepIndex } from "../utils/timelineNavigation";

const NAVIGATION_STEP_OPTIONS_MINUTES = [1, 5, 15, 60, 360, 1_440] as const;
const MAX_READING_AGE_OPTIONS_MINUTES = [5, 10, 15, 30, 60] as const;
const PLAYBACK_INTERVAL_OPTIONS_SECONDS = [0.25, 0.5, 1, 2, 5, 10] as const;

interface Props {
  frames: HistoricalTemperatureFieldFrame[];
  selectedFrameIndex: number;
  navigationStepMinutes: number;
  maxReadingAgeMinutes: number;
  playbackIntervalSeconds: number;
  isPlaying: boolean;
  isLooping: boolean;
  onTogglePlay: () => void;
  onLoopingChange: (looping: boolean) => void;
  onSelectedFrameIndexChange: (index: number) => void;
  onNavigationStepMinutesChange: (minutes: number) => void;
  onMaxReadingAgeMinutesChange: (minutes: number) => void;
  onPlaybackIntervalSecondsChange: (seconds: number) => void;
}

export function HistoricalTemperatureTimelineControls({
  frames,
  selectedFrameIndex,
  navigationStepMinutes,
  maxReadingAgeMinutes,
  playbackIntervalSeconds,
  isPlaying,
  isLooping,
  onTogglePlay,
  onLoopingChange,
  onSelectedFrameIndexChange,
  onNavigationStepMinutesChange,
  onMaxReadingAgeMinutesChange,
  onPlaybackIntervalSecondsChange,
}: Props) {
  const { t } = useTranslation("temperature");
  const latestFrameIndex = frames.length - 1;
  const selectedFrame = frames[selectedFrameIndex];
  const formatInterval = (minutes: number) =>
    minutes < 60
      ? t("insights.historyMap.minutes", { count: minutes })
      : t("insights.historyMap.hours", { count: minutes / 60 });

  return (
    <div className="historical-temperature-field__controls">
      <div className="historical-temperature-field__transport-row">
        <div className="historical-temperature-field__transport">
          <KernButton
            type="button"
            variant="tertiary"
            icon="arrow-back"
            label={t("insights.historyMap.earlier")}
            disabled={selectedFrameIndex === 0}
            onClick={() =>
              onSelectedFrameIndexChange(
                findTimelineStepIndex(frames, selectedFrameIndex, navigationStepMinutes, -1),
              )
            }
          />
          <KernButton
            type="button"
            variant="primary"
            label={
              isPlaying
                ? t("insights.historyMap.pause")
                : t("insights.historyMap.play")
            }
            aria-pressed={isPlaying}
            disabled={latestFrameIndex === 0}
            onClick={onTogglePlay}
          />
          <KernButton
            type="button"
            variant="tertiary"
            icon="arrow-forward"
            label={t("insights.historyMap.later")}
            disabled={selectedFrameIndex === latestFrameIndex}
            onClick={() =>
              onSelectedFrameIndexChange(
                findTimelineStepIndex(frames, selectedFrameIndex, navigationStepMinutes, 1),
              )
            }
          />
        </div>
        <KernButton
          type="button"
          variant="tertiary"
          label={t("insights.historyMap.latest")}
          disabled={selectedFrameIndex === latestFrameIndex}
          onClick={() => onSelectedFrameIndexChange(latestFrameIndex)}
        />
      </div>

      <div className="historical-temperature-field__timeline">
        <div className="historical-temperature-field__timeline-header">
          <div>
            <label className="kern-label" htmlFor="historical-temperature-field-slider">
              {t("insights.historyMap.selectedTime")}
            </label>
            <strong className="historical-temperature-field__selected-time">
              {formatTimestamp(selectedFrame.timestamp)}
            </strong>
          </div>
          <span className="historical-temperature-field__position kern-body kern-body--small">
            {t("insights.historyMap.timelinePosition", {
              current: selectedFrameIndex + 1,
              total: frames.length,
            })}
          </span>
        </div>
        <input
          id="historical-temperature-field-slider"
          className="historical-temperature-field__slider"
          type="range"
          min={0}
          max={latestFrameIndex}
          step={1}
          value={selectedFrameIndex}
          onChange={(event) => onSelectedFrameIndexChange(Number(event.target.value))}
          aria-valuetext={formatTimestamp(selectedFrame.timestamp)}
        />
        <div className="historical-temperature-field__range-labels">
          <span className="kern-body kern-body--small">
            {formatTimestamp(frames[0].timestamp)}
          </span>
          <span className="kern-body kern-body--small">
            {formatTimestamp(frames[latestFrameIndex].timestamp)}
          </span>
        </div>
      </div>

      <div className="historical-temperature-field__settings">
        <fieldset className="historical-temperature-field__control-group">
          <legend className="kern-label">
            {t("insights.historyMap.timelineSettingsLabel")}
          </legend>
          <div className="historical-temperature-field__setting-fields">
            <div className="historical-temperature-field__setting-field">
              <label className="kern-label" htmlFor="historical-temperature-field-max-reading-age">
                {t("insights.historyMap.maxReadingAgeLabel")}
              </label>
              <div className="kern-form-input__select-wrapper">
                <select
                  id="historical-temperature-field-max-reading-age"
                  className="kern-form-input__select"
                  value={maxReadingAgeMinutes}
                  onChange={(event) => onMaxReadingAgeMinutesChange(Number(event.target.value))}
                >
                  {MAX_READING_AGE_OPTIONS_MINUTES.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {formatInterval(minutes)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="historical-temperature-field__setting-field">
              <label className="kern-label" htmlFor="historical-temperature-field-navigation-step">
                {t("insights.historyMap.navigationStepLabel")}
              </label>
              <div className="kern-form-input__select-wrapper">
                <select
                  id="historical-temperature-field-navigation-step"
                  className="kern-form-input__select"
                  value={navigationStepMinutes}
                  onChange={(event) => onNavigationStepMinutesChange(Number(event.target.value))}
                >
                  {NAVIGATION_STEP_OPTIONS_MINUTES.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {formatInterval(minutes)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="historical-temperature-field__control-group">
          <legend className="kern-label">
            {t("insights.historyMap.playbackSettingsLabel")}
          </legend>
          <div className="historical-temperature-field__setting-fields historical-temperature-field__setting-fields--playback">
            <div className="historical-temperature-field__setting-field">
              <label className="kern-label" htmlFor="historical-temperature-field-playback-interval">
                {t("insights.historyMap.playbackIntervalLabel")}
              </label>
              <div className="kern-form-input__select-wrapper">
                <select
                  id="historical-temperature-field-playback-interval"
                  className="kern-form-input__select"
                  value={playbackIntervalSeconds}
                  onChange={(event) =>
                    onPlaybackIntervalSecondsChange(Number(event.target.value))
                  }
                >
                  {PLAYBACK_INTERVAL_OPTIONS_SECONDS.map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {t("insights.historyMap.seconds", { count: seconds })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="historical-temperature-field__loop-toggle">
              <input
                type="checkbox"
                checked={isLooping}
                disabled={latestFrameIndex === 0}
                onChange={(event) => onLoopingChange(event.target.checked)}
              />
              <span className="kern-label">{t("insights.historyMap.loop")}</span>
            </label>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
