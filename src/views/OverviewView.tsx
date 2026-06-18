import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import {
  KernBadge,
  KernIcon,
  type KernIconType,
} from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { fetchSensors } from "../api/sensorcity";
import { AsyncBoundary } from "../components/Status";
import {
  CATEGORIES,
  categoryColor,
  categoryLabelKey,
  measurementLabelKey,
} from "../config/layers";
import { useAsync } from "../hooks/useAsync";
import type { Sensor } from "../types";
import { formatValue, timeAgo } from "../utils/format";

export function OverviewView() {
  const sensors = useAsync(fetchSensors, []);
  const { t } = useTranslation("overview");

  return (
    <AsyncBoundary
      state={sensors}
      isEmpty={(data) => data.length === 0}
      emptyLabel={t("empty")}
    >
      {(data) => <PulseDashboard sensors={data} />}
    </AsyncBoundary>
  );
}

const QUICK_LINKS = [
  { to: "/map", icon: "visibility", key: "map" },
  { to: "/sensors", icon: "checklist", key: "sensors" },
  { to: "/query", icon: "search", key: "query" },
] satisfies Array<{ to: string; icon: KernIconType; key: string }>;

function PulseDashboard({ sensors }: { sensors: Sensor[] }) {
  const { t } = useTranslation("overview");
  const { t: tc } = useTranslation("common");

  const categories = CATEGORIES.map((category) => {
    const items = sensors.filter((sensor) => sensor.category === category.key);
    const newest = [...items].sort(
      (a, b) => (b.measuredAt ?? 0) - (a.measuredAt ?? 0),
    )[0];
    const primary = category.measurements[0];
    return { category, items, newest, primary };
  }).filter((entry) => entry.items.length > 0);

  const latest = [...sensors].sort(
    (a, b) => (b.measuredAt ?? 0) - (a.measuredAt ?? 0),
  )[0];
  const mapped = sensors.filter(
    (sensor) => sensor.lat != null && sensor.lon != null,
  ).length;
  const fresh = sensors.filter((sensor) => {
    if (sensor.measuredAt == null) return false;
    return Date.now() - sensor.measuredAt < 60 * 60 * 1000;
  }).length;

  return (
    <div className="pulse">
      {/* Intro + headline KPIs: scannable for everyone, exact counts for power users. */}
      <header className="pulse__bar">
        <div className="pulse__intro">
          <KernBadge label={t("badge")} variant="info" />
          <h1 className="kern-heading-medium" id="pulse-heading">
            {t("heading")}
          </h1>
          <p className="kern-body kern-body--muted">{t("intro")}</p>
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

      {/* Category signals: the centrepiece. Each card is a live reading and a
          shortcut into the filtered sensor atlas. */}
      <section className="pulse__signals" aria-labelledby="pulse-categories">
        <h2 id="pulse-categories" className="visually-hidden">
          {t("categoriesHeading")}
        </h2>
        {categories.map(({ category, items, newest, primary }) => (
          <article
            className="signal-card"
            key={category.key}
            aria-labelledby={`signal-card-${category.key}`}
            style={
              {
                "--category-color": categoryColor(category.key),
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
                className="kern-badge kern-badge--small"
                title={t("sensorCount", { count: items.length })}
                aria-label={t("sensorCount", { count: items.length })}
              >
                <span className="kern-label">{items.length}</span>
              </span>
            </span>
            <span className="signal-card__value">
              {newest && primary
                ? formatValue(newest.attributes[primary.field], primary.unit)
                : "—"}
            </span>
            <span className="signal-card__label kern-body kern-body--small">
              {t("latestValue")} ·{" "}
              {primary ? tc(measurementLabelKey(primary.field)) : t("currentReading")}
            </span>
            {newest && (
              <Link
                className="signal-card__name"
                title={newest.name}
                to={`/sensor/${newest.objectId}`}
              >
                {newest.name}
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
