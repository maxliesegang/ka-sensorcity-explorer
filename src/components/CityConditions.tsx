import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { PrecipitationStatus } from "../api/sensorcity";
import type { WaterTrends } from "../api/waterTrends";
import type { Sensor } from "../types";
import type { CityConditions as CityConditionsModel } from "../utils/cityConditions";
import {
  formatGaugeName,
  formatSignedDelta,
  formatTimestamp,
  formatValue,
} from "../utils/format";
import type { WaterTrendDirection } from "../utils/waterTrend";

/** Direction as a glyph; the wording beside it is what carries the meaning. */
const TREND_ARROW: Record<WaterTrendDirection, string> = {
  rising: "↑",
  falling: "↓",
  steady: "→",
};

/**
 * The three questions a resident brings to a sensor network — how warm is it, is
 * it raining, how are the rivers — answered in a sentence each, above the
 * network statistics.
 *
 * Every answer is a summary over all reporting sensors and says how many it
 * speaks for, because a single sensor's reading presented at this size reads as
 * a statement about the city. Rain and the river trends arrive separately (and
 * may still be loading, or absent) because they come from archives rather than
 * the live layer.
 */
export function CityConditions({
  conditions,
  rain,
  sensors,
  waterTrends,
}: {
  conditions: CityConditionsModel;
  rain: PrecipitationStatus | null;
  /** The loaded live sensors, for resolving a named station to its page. */
  sensors: readonly Sensor[];
  waterTrends: WaterTrends | null;
}) {
  const { t } = useTranslation("overview");
  const { temperature, water } = conditions;

  // Nothing to answer with: the categories below still show what did arrive.
  if (!temperature && !rain && !water) return null;

  // The rain answer comes from the archive, which knows the station's device id
  // but not its object id — and writes its name differently ("Thomashofstrasse"
  // for the live layer's "Thomashofstraße"), so the id is what matches.
  const wettestSensor = rain?.wettest
    ? sensors.find((sensor) => sensor.deviceId === rain.wettest?.deviceId)
    : undefined;

  return (
    <section className="conditions" aria-labelledby="conditions-heading">
      <h2 className="kern-heading-small" id="conditions-heading">
        {t("conditions.heading")}
      </h2>
      <div className="conditions__grid">
        {temperature && (
          <article className="condition-card">
            <span className="condition-card__label">
              {t("conditions.temperature.label")}
            </span>
            <span className="condition-card__value">
              {formatValue(temperature.median, "°C")}
            </span>
            <p className="kern-body kern-body--small">
              {t("conditions.temperature.summary", {
                count: temperature.count,
                min: formatValue(temperature.min, "°C"),
                max: formatValue(temperature.max, "°C"),
              })}
            </p>
            <p className="kern-body kern-body--small kern-body--muted">
              {t("conditions.temperature.warmest")}{" "}
              <Link className="kern-link" to={`/sensor/${temperature.warmest.objectId}`}>
                {temperature.warmest.name}
              </Link>{" "}
              ({formatValue(temperature.warmest.value, "°C")})
            </p>
            <Link className="card-link__cue" to="/temperature">
              {t("conditions.temperature.link")}
            </Link>
          </article>
        )}

        {rain && (
          <article className="condition-card">
            <span className="condition-card__label">
              {t("conditions.rain.label")}
            </span>
            <span className="condition-card__value">
              {rain.wet === 0
                ? t("conditions.rain.dryValue")
                : t("conditions.rain.wetValue", { count: rain.wet })}
            </span>
            <p className="kern-body kern-body--small">
              {rain.wet === 0
                ? t("conditions.rain.drySummary", { count: rain.reporting })
                : t("conditions.rain.wetSummary", {
                    count: rain.wet,
                    total: rain.reporting,
                  })}
            </p>
            {/* No amount is quoted: the field is declared in millimetres but
                publishes values that don't behave like them. The station is a
                link wherever the live layer still carries it — naming a sensor
                without a way to open it is a dead end. */}
            {rain.wettest && (
              <p className="kern-body kern-body--small kern-body--muted">
                {t("conditions.rain.wettest")}{" "}
                {wettestSensor ? (
                  <Link className="kern-link" to={`/sensor/${wettestSensor.objectId}`}>
                    {wettestSensor.name}
                  </Link>
                ) : (
                  rain.wettest.name
                )}
              </p>
            )}
          </article>
        )}

        {water && (
          /* Each gauge stands for its own river, so the card shows how each one
             has moved rather than ranking the levels: the Rhine reads 310 cm on
             an ordinary day and the Alb 40, so a "highest" names the Rhine every
             day and says nothing, while "10 cm lower" reads the same on every
             river. No flood threshold is implied — the feed publishes none. */
          <article className="condition-card condition-card--rows">
            <span className="condition-card__label">
              {t("conditions.water.label")}
            </span>
            <ul className="gauge-list">
              {water.gauges.map((gauge) => {
                const trend = waterTrends?.get(gauge.objectId);
                return (
                  <li className="gauge" key={gauge.objectId}>
                    <Link className="gauge__name" to={`/sensor/${gauge.objectId}`}>
                      {formatGaugeName(gauge.name)}
                    </Link>
                    <span className="gauge__value">{formatValue(gauge.value, "cm")}</span>
                    {trend && (
                      /* The window ends at the archive's newest reading rather
                         than now, and that upstream lags by hours at a time, so
                         the period it covers is on the row's tooltip. */
                      <span
                        className={`gauge__trend gauge__trend--${trend.direction}`}
                        title={t("conditions.water.trendPeriod", {
                          from: formatTimestamp(trend.from),
                          to: formatTimestamp(trend.to),
                        })}
                      >
                        <span aria-hidden="true">{TREND_ARROW[trend.direction]}</span>{" "}
                        {t(`conditions.water.trend.${trend.direction}`)}
                        {trend.direction === "steady"
                          ? ""
                          : ` ${formatSignedDelta(trend.delta, "cm")}`}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </article>
        )}
      </div>
    </section>
  );
}
