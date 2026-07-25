// Reusable, fully presentational control strip for a map field's
// baseline deviation mode. It owns no state, fetches no data and uses
// no translation hooks — every label and value arrives via props so it can be
// shared by the temperature maps and the soil field.

import type { BaselineOption } from "../config/temperatureBaselines";
import type { FieldDisplayMode } from "../types";

export interface FieldBaselineControlsProps {
  baselineSelectId: string;
  displayMode: FieldDisplayMode;
  onDisplayModeChange: (mode: FieldDisplayMode) => void;
  baselineId: string | null;
  onBaselineIdChange: (id: string) => void;
  /** Selectable baseline options, already localized. */
  baselineOptions: BaselineOption[];
  displayModeLabel: string;
  /** Label for the "show the reading itself" mode (e.g. "Temperature", "Moisture"). */
  valueModeLabel: string;
  deviationModeLabel: string;
  baselineSelectLabel: string;
  /** Whether per-cell value labels are drawn on the map. */
  showLabels: boolean;
  onShowLabelsChange: (value: boolean) => void;
  showLabelsLabel: string;
}

export function FieldBaselineControls({
  baselineSelectId,
  displayMode,
  onDisplayModeChange,
  baselineId,
  onBaselineIdChange,
  baselineOptions,
  displayModeLabel,
  valueModeLabel,
  deviationModeLabel,
  baselineSelectLabel,
  showLabels,
  onShowLabelsChange,
  showLabelsLabel,
}: FieldBaselineControlsProps) {
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
            (displayMode === "value" ? " segmented-control__option--active" : "")
          }
          aria-pressed={displayMode === "value"}
          onClick={() => onDisplayModeChange("value")}
        >
          {valueModeLabel}
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
