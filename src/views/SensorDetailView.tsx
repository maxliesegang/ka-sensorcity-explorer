import { useState } from "react";
import type { CSSProperties } from "react";
import { KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { resolveHistorySource } from "../api/history";
import { fetchSensor } from "../api/sensorcity";
import { DetailTabs } from "../components/DetailTabs";
import type { DetailTabItem } from "../components/DetailTabs";
import { LineChart } from "../components/LineChart";
import { SensorHistoryAnalysis } from "../components/SensorHistoryAnalysis";
import { SensorLocationSection } from "../components/SensorLocationSection";
import { AsyncBoundary, Empty } from "../components/Status";
import {
  categoryColor,
  categoryLabelKey,
  getCategory,
  measurementLabelKey,
} from "../config/layers";
import { useAsync } from "../hooks/useAsync";
import type { Category, Sensor } from "../types";
import { formatTimestamp, formatValue, timeAgo } from "../utils/format";

/** Attribute keys that hold epoch-ms timestamps and should be formatted as dates. */
const TIMESTAMP_FIELDS = new Set(["measured_at", "inserted_at"]);
type DetailTab = "current" | "history" | "location" | "raw";

/**
 * Detail page for one sensor: header + badge, current readings, a history chart
 * for a selectable measurement, and a raw-attribute dump for transparency.
 */
export function SensorDetailView() {
  const { objectId: objectIdParam } = useParams<{ objectId: string }>();
  const objectId = Number(objectIdParam);
  const navigate = useNavigate();
  const state = useAsync((s) => fetchSensor(objectId, s), [objectId]);
  const { t } = useTranslation("detail");

  return (
    <section>
      <KernButton
        type="button"
        variant="tertiary"
        className="kern-btn--x-small back-link"
        onClick={() => navigate(-1)}
        icon="arrow-back"
        label={t("back")}
      />
      <AsyncBoundary
        state={state}
        isEmpty={(sensor) => sensor == null}
        emptyLabel={t("notFound")}
      >
        {(sensor) => <SensorDetail sensor={sensor as Sensor} />}
      </AsyncBoundary>
    </section>
  );
}

/** Inner view that receives the loaded sensor so its hooks stay top-level. */
function SensorDetail({ sensor }: { sensor: Sensor }) {
  const { t } = useTranslation("detail");
  const { t: tc } = useTranslation("common");
  const category = getCategory(sensor.category);
  const label = category
    ? tc(categoryLabelKey(category.key))
    : sensor.category;
  const measurements = category?.measurements ?? [];
  const [selectedField, setSelectedField] = useState(measurements[0]?.field ?? "");
  const [activeTab, setActiveTab] = useState<DetailTab>("current");
  const primary = measurements[0];

  const tabs: DetailTabItem<DetailTab>[] = [
    {
      id: "current",
      label: t("tabs.current"),
      panel: (
        <CurrentReadingsSection sensor={sensor} measurements={measurements} />
      ),
    },
    {
      id: "history",
      label: t("tabs.history"),
      panel: (
        <HistorySection
          sensor={sensor}
          category={category}
          selectedField={selectedField}
          onSelectField={setSelectedField}
        />
      ),
    },
    {
      id: "location",
      label: t("tabs.location"),
      panel: <SensorLocationSection sensor={sensor} />,
    },
    {
      id: "raw",
      label: t("tabs.raw"),
      panel: <RawAttributes sensor={sensor} />,
    },
  ];

  return (
    <div
      className="sensor-detail stack"
      style={{ "--category-color": categoryColor(sensor.category) } as CSSProperties}
    >
      <header className="detail-hero">
        <div className="detail-hero__main">
          <span className="legend-item">
            <span
              className="cat-dot"
              style={{ background: categoryColor(sensor.category) }}
              aria-hidden="true"
            />
            {label}
          </span>
          <h1 className="kern-heading-large">{sensor.name}</h1>
          <p className="kern-body kern-body--muted">{t("heroSubtitle")}</p>
        </div>
        <div className="detail-hero__reading">
          <span className="pulse-stat__label">
            {primary ? tc(measurementLabelKey(primary.field)) : t("primaryValue")}
          </span>
          <span className="pulse-stat__value">
            {primary ? formatValue(sensor.attributes[primary.field], primary.unit) : "—"}
          </span>
          <span className="kern-body kern-body--small">{timeAgo(sensor.measuredAt)}</span>
        </div>
      </header>

      <DetailTabs
        ariaLabel={t("tabs.aria")}
        items={tabs}
        activeId={activeTab}
        onActiveIdChange={setActiveTab}
      />
    </div>
  );
}

function CurrentReadingsSection({
  sensor,
  measurements,
}: {
  sensor: Sensor;
  measurements: Category["measurements"];
}) {
  const { t } = useTranslation("detail");
  const { t: tc } = useTranslation("common");

  return (
    <section className="sensor-detail__section sensor-detail__section--plain">
      <div className="section-toolbar">
        <div>
          <h2 className="kern-heading-small">{t("currentReadings")}</h2>
          <p className="kern-body kern-body--small kern-body--muted">
            {t("currentIntro")}
          </p>
        </div>
        <span className="kern-body kern-body--small">
          {t("lastMeasuredAt", { date: formatTimestamp(sensor.measuredAt) })}
        </span>
      </div>
      <div className="reading-grid reading-grid--featured">
        {measurements.map((m) => (
          <div className="reading-card" key={m.field}>
            <span className="reading-card__label">
              {tc(measurementLabelKey(m.field))}
            </span>
            <span className="reading-card__value">
              {formatValue(sensor.attributes[m.field], m.unit)}
            </span>
          </div>
        ))}
      </div>
      <dl className="kern-description-list detail-facts">
        <div className="kern-description-list-item">
          <dt className="kern-description-list-item__key">
            {t("facts.lastMeasured")}
          </dt>
          <dd className="kern-description-list-item__value">
            {timeAgo(sensor.measuredAt)} · {formatTimestamp(sensor.measuredAt)}
          </dd>
        </div>
        <div className="kern-description-list-item">
          <dt className="kern-description-list-item__key">
            {t("facts.deviceId")}
          </dt>
          <dd className="kern-description-list-item__value mono">
            {sensor.deviceId || "—"}
          </dd>
        </div>
        <div className="kern-description-list-item">
          <dt className="kern-description-list-item__key">
            {t("facts.coordinates")}
          </dt>
          <dd className="kern-description-list-item__value mono">
            {sensor.lat != null && sensor.lon != null
              ? `${sensor.lat.toFixed(5)}, ${sensor.lon.toFixed(5)}`
              : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** History chart with a measurement picker, or a note if no archive exists. */
function HistorySection({
  sensor,
  category,
  selectedField,
  onSelectField,
}: {
  sensor: Sensor;
  category: Category | undefined;
  selectedField: string;
  onSelectField: (field: string) => void;
}) {
  const { t } = useTranslation("detail");
  const { t: tc } = useTranslation("common");
  const selected = category?.measurements.find((m) => m.field === selectedField);
  const source = resolveHistorySource(sensor, category, selectedField);
  const history = useAsync(
    (s) => (source ? source.fetch(s) : Promise.resolve([])),
    [sensor.category, sensor.deviceId, selectedField, category?.archiveLayerId],
    { enabled: source != null },
  );

  if (source == null) {
    return (
      <section className="sensor-detail__section sensor-detail__section--plain">
        <h2 className="kern-heading-small">{t("history")}</h2>
        <p className="kern-body kern-body--muted">{t("noArchiveNote")}</p>
      </section>
    );
  }

  return (
    <section className="sensor-detail__section sensor-detail__section--plain">
      <div className="section-toolbar">
        <div>
          <h2 className="kern-heading-small">{t("history")}</h2>
          <p className="kern-body kern-body--small kern-body--muted">
            {source.info.url ? (
              <>
                {t("historySource")}{" "}
                <a
                  className="kern-link"
                  href={source.info.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.info.label}
                </a>
              </>
            ) : (
              t("historySourceLabel", { source: source.info.label })
            )}
          </p>
        </div>
        <div className="field kern-form-input">
          <label className="kern-label" htmlFor="measurement-select">
            {t("measurement")}
          </label>
          <div className="kern-form-input__select-wrapper">
            <select
              id="measurement-select"
              className="kern-form-input__select"
              value={selectedField}
              onChange={(e) => onSelectField(e.target.value)}
            >
              {category?.measurements.map((m) => (
                <option key={m.field} value={m.field}>
                  {tc(measurementLabelKey(m.field))}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <AsyncBoundary
        state={history}
        isEmpty={(pts) => pts.length === 0}
        emptyLabel={t("noHistory")}
      >
        {(points) =>
          points.length === 0 ? (
            <Empty label={t("noHistory")} />
          ) : (
            <>
              <LineChart
                points={points}
                unit={selected?.unit}
                label={
                  selected
                    ? tc(measurementLabelKey(selected.field))
                    : tc("chart.measurement")
                }
                color={categoryColor(sensor.category)}
              />
              <SensorHistoryAnalysis
                points={points}
                unit={selected?.unit}
                label={
                  selected
                    ? tc(measurementLabelKey(selected.field))
                    : tc("chart.measurement")
                }
                color={categoryColor(sensor.category)}
              />
            </>
          )
        }
      </AsyncBoundary>
    </section>
  );
}

/** Raw attribute dump, skipping null/empty values. */
function RawAttributes({ sensor }: { sensor: Sensor }) {
  const { t } = useTranslation("detail");
  const rows = Object.entries(sensor.attributes).filter(
    ([, v]) => v != null && v !== "",
  );

  return (
    <section className="sensor-detail__section sensor-detail__section--plain">
      <div className="section-toolbar">
        <div>
          <h2 className="kern-heading-small">{t("rawAttributes")}</h2>
          <p className="kern-body kern-body--small kern-body--muted">
            {t("rawIntro")}
          </p>
        </div>
      </div>
      <div className="kern-table-responsive table-scroll">
        <table className="kern-table kern-table--striped kern-table--small">
          <thead>
            <tr className="kern-table__row">
              <th className="kern-table__header" scope="col">{t("rawField")}</th>
              <th className="kern-table__header" scope="col">{t("rawValue")}</th>
            </tr>
          </thead>
          <tbody className="kern-table__body">
            {rows.map(([key, value]) => (
              <tr className="kern-table__row" key={key}>
                <td className="kern-table__cell mono">{key}</td>
                <td className="kern-table__cell">
                  {TIMESTAMP_FIELDS.has(key) && typeof value === "number"
                    ? formatTimestamp(value)
                    : String(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
