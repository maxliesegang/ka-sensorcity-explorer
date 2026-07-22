// Model-aware chrome shared by every temperature-field view (live SensorCity,
// the combined community blend, and the historical replay). Each view derives the
// same `TemperatureFieldLegendModel` and baseline state (see useTemperatureFieldModel);
// these two pieces turn that model into UI so the three views stay in lock-step
// and a fourth builds on them rather than copying the JSX.

import { useTranslation } from "react-i18next";

import type { DwdHourlyPoint } from "../api/brightsky";
import { formatSignedDelta, formatTime, formatValue } from "../utils/format";
import type { TemperatureFieldLegendModel } from "../utils/temperatureFieldModel";
import { TemperatureLegend } from "./TemperatureLegend";

const TEMPERATURE_UNIT = "°C";

interface TemperatureFieldLegendProps {
  legend: TemperatureFieldLegendModel | null;
  getTemperatureCaption: (count: number) => string;
  deviationCaption: string;
}

/**
 * Render a `TemperatureFieldLegendModel` as the shared `TemperatureLegend`, picking the
 * temperature vs. diverging-deviation presentation from the model's `kind`. Captions
 * differ per view, so they're supplied by the caller — `getTemperatureCaption` receives
 * the model's sensor count; `deviationCaption` is prebuilt (it names the baseline).
 * Renders nothing when there is no legend yet.
 */
export function TemperatureFieldLegend({
  legend,
  getTemperatureCaption,
  deviationCaption,
}: TemperatureFieldLegendProps) {
  if (!legend) return null;
  if (legend.kind === "deviation") {
    return (
      <TemperatureLegend
        gradient={legend.gradient}
        minLabel={formatSignedDelta(legend.min, TEMPERATURE_UNIT)}
        midLabel="0 °C"
        midPos={legend.zeroPos}
        maxLabel={formatSignedDelta(legend.max, TEMPERATURE_UNIT)}
        caption={deviationCaption}
      />
    );
  }
  return (
    <TemperatureLegend
      gradient={legend.gradient}
      minLabel={formatValue(legend.min, TEMPERATURE_UNIT)}
      maxLabel={formatValue(legend.max, TEMPERATURE_UNIT)}
      caption={getTemperatureCaption(legend.count)}
    />
  );
}

/**
 * The two muted footnotes shown under a deviation map's status line: the DWD
 * reference reading (when the DWD baseline resolved) and the "baseline
 * unavailable" note (when deviation was asked for but no baseline reading was
 * found — showing the DWD fetch error when that's the cause). Renders nothing
 * outside deviation mode.
 */
interface TemperatureBaselineStatusProps {
  isDeviationModeActive: boolean;
  dwdBaselineObservation: DwdHourlyPoint | null;
  isBaselineTemperatureUnavailable: boolean;
  isDwdBaselineSelected: boolean;
  dwdBaselineError: string | null;
}

export function TemperatureBaselineStatus({
  isDeviationModeActive,
  dwdBaselineObservation,
  isBaselineTemperatureUnavailable,
  isDwdBaselineSelected,
  dwdBaselineError,
}: TemperatureBaselineStatusProps) {
  const { t } = useTranslation("temperature");
  return (
    <>
      {isDeviationModeActive && dwdBaselineObservation && (
        <span className="kern-body kern-body--small kern-body--muted">
          {t("baseline.dwdReading", {
            value: formatValue(dwdBaselineObservation.temperature, TEMPERATURE_UNIT),
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
    </>
  );
}
