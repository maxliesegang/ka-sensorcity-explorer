import { Link } from "react-router-dom";
import { useMemo, type CSSProperties } from "react";
import { KernIcon, type KernIconType } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import {
  fetchCityPrecipitationStatus,
  fetchSensors,
  type PrecipitationStatus,
} from "../api/sensorcity";
import { CityConditions } from "../components/CityConditions";
import { DataFreshness } from "../components/DataFreshness";
import { NearMeSensors } from "../components/NearMeSensors";
import { AsyncBoundary } from "../components/Status";
import {
  CATEGORIES,
  getCategoryColor,
  categoryLabelKey,
  measurementLabelKey,
  WATER_CATEGORY_KEY,
} from "../config/layers";
import { fetchWaterTrends } from "../api/waterTrends";
import { useAsync, type AsyncState } from "../hooks/useAsync";
import { useTicker } from "../hooks/useTicker";
import type { Sensor } from "../types";
import {
  getCityConditions,
  summarizeCategoryReadings,
} from "../utils/cityConditions";
import { formatValue, timeAgo } from "../utils/format";
import { isRecentlyMeasured } from "../utils/sensorFreshness";

export function OverviewView() {
  const sensors = useAsync(fetchSensors, [], { reloadOnFocus: true });
  // Rain is a second request: the live layer has no precipitation column, so it
  // comes from the weather archive. Its absence never blocks the page.
  const rain = useAsync(fetchCityPrecipitationStatus, [], { reloadOnFocus: true });
  const { t } = useTranslation("overview");

  return (
    <AsyncBoundary
      state={sensors}
      isEmpty={(data) => data.length === 0}
      emptyLabel={t("empty")}
    >
      {(data) => (
        <PulseDashboard
          sensors={data}
          rain={rain.data}
          state={sensors}
          onRefresh={() => {
            sensors.reload();
            rain.reload();
          }}
        />
      )}
    </AsyncBoundary>
  );
}

/** The most recently reporting sensor, by a scan rather than a sort-and-take. */
function newestOf(sensors: readonly Sensor[]): Sensor | undefined {
  let newest: Sensor | undefined;
  for (const sensor of sensors) {
    if (newest === undefined || (sensor.measuredAt ?? 0) > (newest.measuredAt ?? 0)) {
      newest = sensor;
    }
  }
  return newest;
}

const QUICK_LINKS = [
  { to: "/map", icon: "visibility", key: "map" },
  { to: "/sensors", icon: "checklist", key: "sensors" },
  { to: "/temperature", icon: "visibility", key: "temperature" },
] satisfies Array<{ to: string; icon: KernIconType; key: string }>;

function PulseDashboard({
  sensors,
  rain,
  state,
  onRefresh,
}: {
  sensors: Sensor[];
  rain: PrecipitationStatus | null;
  state: AsyncState<Sensor[]>;
  onRefresh: () => void;
}) {
  const { t } = useTranslation("overview");
  const { t: tc } = useTranslation("common");
  const now = useTicker();

  const conditions = useMemo(() => getCityConditions(sensors, now), [now, sensors]);

  // Which way each river has gone: one archive read per gauge, and there are
  // three. It depends on the loaded sensors, so it lives here rather than
  // beside the other loaders — and its absence never blocks the card, which
  // still shows every gauge's level.
  const gauges = useMemo(
    () => sensors.filter((sensor) => sensor.category === WATER_CATEGORY_KEY),
    [sensors],
  );
  const waterTrends = useAsync(
    (signal) => fetchWaterTrends(gauges, signal),
    [gauges],
    { reloadOnFocus: true },
  );

  // Each card summarizes its category rather than quoting one sensor: the
  // headline is the median across everything reporting, with the range it sits
  // in underneath. A single reading at that size reads as a city figure.
  const categories = useMemo(
    () =>
      CATEGORIES.map((category) => {
        const items = sensors.filter((sensor) => sensor.category === category.key);
        const newest = newestOf(items);
        const primary = category.measurements[0];
        // `items` is already this category's sensors; summarizing them directly
        // saves re-applying the same membership test over the full list.
        const summary = summarizeCategoryReadings(items, category.key, primary, now);
        return { category, items, newest, primary, summary };
      }).filter((entry) => entry.items.length > 0),
    [now, sensors],
  );

  // One pass for the header KPIs, memoized with the cards above: these are a
  // property of the loaded data, and recomputing them on every unrelated
  // re-render (a rain response landing, a refresh flipping `loading`) means
  // sorting and re-scanning the whole list for an unchanged answer.
  const { latest, mapped, fresh } = useMemo(() => {
    let mapped = 0;
    let fresh = 0;
    for (const sensor of sensors) {
      if (sensor.lat != null && sensor.lon != null) mapped += 1;
      if (isRecentlyMeasured(sensor, now)) fresh += 1;
    }
    return { latest: newestOf(sensors), mapped, fresh };
  }, [now, sensors]);

  return (
    <div className="pulse">
      {/* Intro + headline KPIs: scannable for everyone, exact counts for power users. */}
      <header className="pulse__bar">
        <div className="pulse__intro">
          <h1 className="kern-heading-medium" id="pulse-heading">
            {t("heading")}
          </h1>
          <p className="kern-body kern-body--muted">{t("intro")}</p>
          <DataFreshness
            state={state}
            onRefresh={onRefresh}
            className="data-freshness--inline"
          />
        </div>
        <dl className="pulse__kpis" aria-label={t("summaryAria")}>
          <div className="kpi kpi--accent">
            <dd className="kpi__value">{sensors.length}</dd>
            <dt className="kpi__label">{t("kpi.liveSensors")}</dt>
          </div>
          <div className="kpi">
            <dd className="kpi__value">{fresh}</dd>
            <dt className="kpi__label">{t("kpi.updatedRecently")}</dt>
          </div>
          <div className="kpi">
            <dd className="kpi__value">{mapped}</dd>
            <dt className="kpi__label">{t("kpi.onMap")}</dt>
          </div>
        </dl>
      </header>

      {/* The answers first: what the network says about the city right now,
          before any statistic about the network itself. */}
      <CityConditions
        conditions={conditions}
        rain={rain}
        sensors={sensors}
        waterTrends={waterTrends.data}
      />

      <NearMeSensors sensors={sensors} />

      {/* Category signals: each card summarizes its category and is a shortcut
          into the filtered sensor atlas. */}
      <section className="pulse__signals" aria-labelledby="pulse-categories">
        <h2 id="pulse-categories" className="visually-hidden">
          {t("categoriesHeading")}
        </h2>
        {categories.map(({ category, items, newest, primary, summary }) => (
          <article
            className="signal-card"
            key={category.key}
            aria-labelledby={`signal-card-${category.key}`}
            style={
              {
                "--category-color": getCategoryColor(category.key),
              } as CSSProperties
            }
          >
            <span className="signal-card__top">
              <span className="legend-item" id={`signal-card-${category.key}`}>
                <span
                  className="cat-dot"
                  style={{ background: category.color }}
                  aria-hidden="true"
                />
                {tc(categoryLabelKey(category.key))}
              </span>
              <span
                className="signal-card__count kern-body kern-body--small"
                title={t("sensorCount", { count: items.length })}
                aria-label={t("sensorCount", { count: items.length })}
              >
                {items.length}
              </span>
            </span>
            <span className="signal-card__value">
              {summary ? formatValue(summary.median, primary?.unit) : "—"}
            </span>
            <span className="signal-card__label kern-body kern-body--small">
              {primary ? tc(measurementLabelKey(primary.field)) : t("currentReading")}
              {summary ? ` · ${t("typicalNow")}` : ""}
            </span>
            <span className="signal-card__range kern-body kern-body--small">
              {summary
                ? t("rangeAcross", {
                    count: summary.count,
                    min: formatValue(summary.min, primary?.unit),
                    max: formatValue(summary.max, primary?.unit),
                  })
                : t("noCurrentReadings")}
            </span>
            {newest && (
              <Link
                className="signal-card__name"
                title={newest.name}
                to={`/sensor/${newest.objectId}`}
              >
                {t("latestFrom", { name: newest.name })}
              </Link>
            )}
            <span className="signal-card__meta kern-body kern-body--small">
              <Link
                className="card-link__cue"
                to={`/sensors?category=${encodeURIComponent(category.key)}`}
              >
                {t("filterSensors")}
              </Link>
              <span className="signal-card__age">
                <i
                  className="kern-icon kern-icon--calendar-today kern-icon--small"
                  aria-hidden="true"
                />
                <span className="signal-card__age-text">
                  {t("updated", { time: timeAgo(newest?.measuredAt ?? null) })}
                </span>
              </span>
            </span>
          </article>
        ))}
      </section>

      {/* Action bar: casual users get clear destinations, power users get a
          direct deep-link to the freshest reading. */}
      <nav className="pulse__actions" aria-label={t("exploreAria")}>
        {QUICK_LINKS.map((link) => (
          <Link className="action-card" key={link.to} to={link.to}>
            <span className="action-card__icon" aria-hidden="true">
              <KernIcon icon={link.icon} />
            </span>
            <span className="action-card__text">
              <strong className="kern-label">{t(`links.${link.key}.title`)}</strong>
              <span className="kern-body kern-body--small">
                {t(`links.${link.key}.hint`)}
              </span>
            </span>
          </Link>
        ))}
        {latest && (
          <Link
            className="action-card action-card--latest"
            to={`/sensor/${latest.objectId}`}
          >
            <span className="action-card__icon" aria-hidden="true">
              <KernIcon icon="autorenew" />
            </span>
            <span className="action-card__text">
              <strong className="kern-label">{t("newestReading")}</strong>
              <span className="kern-body kern-body--small">
                {latest.name} · {timeAgo(latest.measuredAt)}
              </span>
            </span>
          </Link>
        )}
      </nav>
    </div>
  );
}
