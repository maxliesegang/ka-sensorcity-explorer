import { KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { TemperatureInsightsData } from "../api/temperatureInsights";
import { formatSignedDelta, formatValue } from "../utils/format";

const TEMPERATURE_UNIT = "°C";

/**
 * The urban heat island, in one sentence and one button.
 *
 * Comparing the city against the DWD's out-of-town Rheinstetten station is the
 * most consequential thing this dataset can say, and it was reachable only by
 * finding "difference from baseline" inside a display-mode select. Here it is a
 * single action, and once active the map's colours are restated as a plain
 * sentence: the city is N °C warmer than the countryside, most at this spot.
 *
 * The DWD reading is fetched only while that baseline is selected, so the
 * pre-activation copy names no numbers.
 */
export function HeatIslandCallout({
  summary,
  baselineTemperature,
  isActive,
  onActivate,
}: {
  summary: TemperatureInsightsData["current"];
  /** The resolved DWD reading, present only once that baseline is selected. */
  baselineTemperature: number | null;
  isActive: boolean;
  onActivate: () => void;
}) {
  const { t } = useTranslation("temperature");

  if (!summary) return null;

  const isComparing = isActive && baselineTemperature != null;
  const meanDelta = isComparing ? summary.mean - baselineTemperature : null;
  const warmestDelta = isComparing ? summary.max - baselineTemperature : null;

  return (
    <aside className="heat-island" aria-labelledby="heat-island-heading">
      <div className="heat-island__text">
        <h2 className="kern-heading-small" id="heat-island-heading">
          {t("heatIsland.heading")}
        </h2>
        {isComparing && meanDelta != null && warmestDelta != null ? (
          <>
            <p className="kern-body">
              {t("heatIsland.active", {
                mean: formatSignedDelta(meanDelta, TEMPERATURE_UNIT),
                baseline: formatValue(baselineTemperature, TEMPERATURE_UNIT),
              })}
            </p>
            <p className="kern-body kern-body--small kern-body--muted">
              {t("heatIsland.warmest", {
                delta: formatSignedDelta(warmestDelta, TEMPERATURE_UNIT),
              })}{" "}
              <Link className="kern-link" to={`/sensor/${summary.hottest.objectId}`}>
                {summary.hottest.name}
              </Link>
            </p>
          </>
        ) : (
          <p className="kern-body">{t("heatIsland.hint")}</p>
        )}
      </div>
      {!isActive && (
        <KernButton
          type="button"
          variant="primary"
          className="kern-btn--small"
          onClick={onActivate}
          label={t("heatIsland.button")}
        />
      )}
    </aside>
  );
}
