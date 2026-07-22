// Reusable, fully presentational control strip for the temperature maps'
// baseline-station deviation mode. It owns no state, fetches no data and uses
// no translation hooks — every label and value arrives via props so it can be
// shared by both the live and historical temperature maps.

import type { BaselineOption } from "../config/temperatureBaselines";
import type { TemperatureDisplayMode } from "../types";

export interface TemperatureBaselineControlsProps {
  baselineSelectId: string;
  displayMode: TemperatureDisplayMode;
  onDisplayModeChange: (mode: TemperatureDisplayMode) => void;
  baselineId: string | null;
  onBaselineIdChange: (id: string) => void;
  /** Selectable baseline options, already localized. */
  baselineOptions: BaselineOption[];
  displayModeLabel: string;
  temperatureModeLabel: string;
  deviationModeLabel: string;
  baselineSelectLabel: string;
  /** Whether per-cell value labels are drawn on the map. */
  showLabels: boolean;
  onShowLabelsChange: (value: boolean) => void;
  showLabelsLabel: string;
}

export function TemperatureBaselineControls({
  baselineSelectId,
  displayMode,
  onDisplayModeChange,
  baselineId,
  onBaselineIdChange,
  baselineOptions,
  displayModeLabel,
  temperatureModeLabel,
  deviationModeLabel,
  baselineSelectLabel,
  showLabels,
  onShowLabelsChange,
  showLabelsLabel,
}: TemperatureBaselineControlsProps) {
  const baselineSelectDisabled = displayMode !== "deviation";

  return (
    <div className="temperature-baseline-controls">
      <div
        className="segmented-control temperature-baseline-controls__modes"
        role="group"
        aria-label={displayModeLabel}
      >
        <button
          type="button"
          className={
            "segmented-control__option" +
            (displayMode === "temperature" ? " segmented-control__option--active" : "")
          }
          aria-pressed={displayMode === "temperature"}
          onClick={() => onDisplayModeChange("temperature")}
        >
          {temperatureModeLabel}
        </button>
        <button
          type="button"
          className={
            "segmented-control__option" +
            (displayMode === "deviation" ? " segmented-control__option--active" : "")
          }
          aria-pressed={displayMode === "deviation"}
          onClick={() => onDisplayModeChange("deviation")}
        >
          {deviationModeLabel}
        </button>
      </div>

      <div
        className={
          "field kern-form-input temperature-baseline-controls__field" +
          (baselineSelectDisabled ? " temperature-baseline-controls__field--disabled" : "")
        }
      >
        <label className="kern-label" htmlFor={baselineSelectId}>
          {baselineSelectLabel}
        </label>
        <div className="kern-form-input__select-wrapper">
          <select
            id={baselineSelectId}
            className="kern-form-input__select"
            value={baselineId ?? baselineOptions[0]?.id ?? ""}
            disabled={baselineSelectDisabled}
            onChange={(e) => onBaselineIdChange(e.target.value)}
          >
            {baselineOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="temperature-baseline-controls__toggle">
        <input
          type="checkbox"
          checked={showLabels}
          onChange={(e) => onShowLabelsChange(e.target.checked)}
        />
        <span className="kern-label">{showLabelsLabel}</span>
      </label>
    </div>
  );
}
