// Reusable, fully presentational control strip for the temperature maps'
// baseline-station deviation mode. It owns no state, fetches no data and uses
// no translation hooks — every label and value arrives via props so it can be
// shared by both the live and historical temperature maps.

import type { BaselineOption, TemperatureFieldMode } from "../config/temperatureBaselines";

export interface TemperatureBaselineControlsProps {
  id: string;
  mode: TemperatureFieldMode;
  onModeChange: (mode: TemperatureFieldMode) => void;
  baselineId: string | null;
  onBaselineChange: (id: string) => void;
  /** Selectable baseline options, already localized. */
  options: BaselineOption[];
  modeLabel: string;
  modeAbsoluteLabel: string;
  modeDeviationLabel: string;
  baselineSelectLabel: string;
  /** Whether per-cell value labels are drawn on the map. */
  showLabels: boolean;
  onShowLabelsChange: (value: boolean) => void;
  showLabelsLabel: string;
}

export function TemperatureBaselineControls({
  id,
  mode,
  onModeChange,
  baselineId,
  onBaselineChange,
  options,
  modeLabel,
  modeAbsoluteLabel,
  modeDeviationLabel,
  baselineSelectLabel,
  showLabels,
  onShowLabelsChange,
  showLabelsLabel,
}: TemperatureBaselineControlsProps) {
  const baselineSelectDisabled = mode !== "deviation";

  return (
    <div className="temperature-baseline-controls">
      <div
        className="segmented-control temperature-baseline-controls__modes"
        role="group"
        aria-label={modeLabel}
      >
        <button
          type="button"
          className={
            "segmented-control__option" +
            (mode === "absolute" ? " segmented-control__option--active" : "")
          }
          aria-pressed={mode === "absolute"}
          onClick={() => onModeChange("absolute")}
        >
          {modeAbsoluteLabel}
        </button>
        <button
          type="button"
          className={
            "segmented-control__option" +
            (mode === "deviation" ? " segmented-control__option--active" : "")
          }
          aria-pressed={mode === "deviation"}
          onClick={() => onModeChange("deviation")}
        >
          {modeDeviationLabel}
        </button>
      </div>

      <div
        className={
          "field kern-form-input temperature-baseline-controls__field" +
          (baselineSelectDisabled ? " temperature-baseline-controls__field--disabled" : "")
        }
      >
        <label className="kern-label" htmlFor={id}>
          {baselineSelectLabel}
        </label>
        <div className="kern-form-input__select-wrapper">
          <select
            id={id}
            className="kern-form-input__select"
            value={baselineId ?? options[0]?.id ?? ""}
            disabled={baselineSelectDisabled}
            onChange={(e) => onBaselineChange(e.target.value)}
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
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
