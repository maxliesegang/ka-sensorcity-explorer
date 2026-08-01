// Reusable, fully presentational control strip for a map field's
// baseline deviation mode. It owns no state, fetches no data and uses
// no translation hooks — every label and value arrives via props so it can be
// shared by the temperature maps and the soil field.

import type { BaselineOption } from "../config/temperatureBaselines";
import type { FieldDisplayMode } from "../types";

export interface FieldBaselineControlsProps {
  displayMode: FieldDisplayMode;
  onDisplayModeChange: (mode: FieldDisplayMode) => void;
  displayModeLabel: string;
  /** Label for the "show the reading itself" mode (e.g. "Temperature", "Moisture"). */
  valueModeLabel: string;
  deviationModeLabel: string;
  /** Omit when comparison has an intrinsic reference, such as each probe's history. */
  baselineSelect?: {
    id: string;
    value: string | null;
    onChange: (id: string) => void;
    /** Selectable baseline options, already localized. */
    options: readonly BaselineOption[];
    label: string;
  };
  /** Whether per-cell value labels are drawn on the map. */
  showLabels: boolean;
  onShowLabelsChange: (value: boolean) => void;
  showLabelsLabel: string;
  /**
   * Whether the Voronoi/Thiessen cells are drawn. Optional: fields that always
   * draw them (the historical replay) omit the three props and get no toggle.
   */
  showCells?: boolean;
  onShowCellsChange?: (value: boolean) => void;
  showCellsLabel?: string;
}

export function FieldBaselineControls({
  displayMode,
  onDisplayModeChange,
  displayModeLabel,
  valueModeLabel,
  deviationModeLabel,
  baselineSelect,
  showLabels,
  onShowLabelsChange,
  showLabelsLabel,
  showCells,
  onShowCellsChange,
  showCellsLabel,
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

      {baselineSelect && (
        <div
          className={
            "field kern-form-input temperature-baseline-controls__field" +
            (baselineSelectDisabled ? " temperature-baseline-controls__field--disabled" : "")
          }
        >
          <label className="kern-label" htmlFor={baselineSelect.id}>
            {baselineSelect.label}
          </label>
          <div className="kern-form-input__select-wrapper">
            <select
              id={baselineSelect.id}
              className="kern-form-input__select"
              value={baselineSelect.value ?? baselineSelect.options[0]?.id ?? ""}
              disabled={baselineSelectDisabled}
              onChange={(e) => baselineSelect.onChange(e.target.value)}
            >
              {baselineSelect.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <label className="temperature-baseline-controls__toggle">
        <input
          type="checkbox"
          checked={showLabels}
          onChange={(e) => onShowLabelsChange(e.target.checked)}
        />
        <span className="kern-label">{showLabelsLabel}</span>
      </label>

      {onShowCellsChange && (
        <label className="temperature-baseline-controls__toggle">
          <input
            type="checkbox"
            checked={showCells ?? true}
            onChange={(e) => onShowCellsChange(e.target.checked)}
          />
          <span className="kern-label">{showCellsLabel}</span>
        </label>
      )}
    </div>
  );
}
