import { memo, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { TimeSeriesPoint } from "../api/sensorcity";
import type {
  TemperatureInsightsData,
  TemperatureSensorStats,
} from "../api/temperatureInsights";
import { formatTimestamp, formatValue } from "../utils/format";
import { HistoricalTemperatureField } from "./HistoricalTemperatureField";
import { LineChart } from "./LineChart";

const UNIT = "°C";
const SPREAD_COLOR = "#d62728";
const LIVE_HEADING_ID = "temp-live-stats-heading";
const HISTORY_HEADING_ID = "temp-insights-heading";
const RANKING_CONTEXT_ID = "temp-ranking-context";
const RANKING_NOTE_ID = "temp-ranking-note";
type HistoryTab = "map" | "sensors" | "spread";

interface HistoryTabDef {
  id: HistoryTab;
  labelKey: string;
}

interface SensorRef {
  objectId: number;
  name: string;
}

function SensorLink({ sensor }: { sensor: SensorRef }) {
  return (
    <Link className="kern-link temp-live-stats__sensor-link" to={`/sensor/${sensor.objectId}`}>
      {sensor.name}
    </Link>
  );
}

/** Format a city-relative deviation with an explicit +/- sign, e.g. "+1.3 °C". */
function formatDeviation(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatValue(value, UNIT)}`;
}

/** Presentational KPI section for live temperature readings only. */
export function TemperatureLiveStats({
  current,
  sensorCount,
}: {
  current: TemperatureInsightsData["current"];
  sensorCount: number;
}) {
  const { t } = useTranslation("temperature");

  return (
    <section className="temp-insights temp-live-stats" aria-labelledby={LIVE_HEADING_ID}>
      <h2 id={LIVE_HEADING_ID} className="kern-heading-large">
        {t("insights.live.heading")}
      </h2>
      <p className="kern-body kern-body--muted">{t("insights.live.intro")}</p>

      {current ? (
        <div className="temp-insights__kpis">
          <div className="pulse-stat">
            <span className="pulse-stat__value">{formatValue(current.spread, UNIT)}</span>
            <span className="kern-label">{t("insights.kpi.spread")}</span>
          </div>
          <div className="pulse-stat">
            <span className="pulse-stat__value">
              {formatValue(current.hottest.value, UNIT)}
            </span>
            <span className="kern-label">{t("insights.kpi.warmest")}</span>
            <p className="kern-body kern-body--small kern-body--muted">
              <SensorLink sensor={current.hottest} />
            </p>
          </div>
          <div className="pulse-stat">
            <span className="pulse-stat__value">
              {formatValue(current.coldest.value, UNIT)}
            </span>
            <span className="kern-label">{t("insights.kpi.coolest")}</span>
            <p className="kern-body kern-body--small kern-body--muted">
              <SensorLink sensor={current.coldest} />
            </p>
          </div>
          <div className="pulse-stat">
            <span className="pulse-stat__value">{formatValue(current.mean, UNIT)}</span>
            <span className="kern-label">{t("insights.kpi.average")}</span>
            <p className="kern-body kern-body--small kern-body--muted">
              {t("insights.kpi.averageDetail", { count: sensorCount })}
            </p>
          </div>
        </div>
      ) : (
        <p className="kern-body kern-body--muted">{t("insights.noCurrent")}</p>
      )}
    </section>
  );
}

/**
 * Presentational history section comparing Karlsruhe's temperature sensors
 * across the retained archive. The parent view owns loading/empty/error states.
 */
export function TemperatureInsights({ insights }: { insights: TemperatureInsightsData }) {
  const { t } = useTranslation("temperature");
  const { current, mostVolatile, perSensor, spreadSeries } = insights;
  const latestArchiveTime =
    insights.fieldFrames.length > 0
      ? insights.fieldFrames[insights.fieldFrames.length - 1].timestamp
      : null;
  const [selectedArchiveTime, setSelectedArchiveTime] = useState<number | null>(
    latestArchiveTime,
  );

  const spreadPoints = useMemo<TimeSeriesPoint[]>(
    () =>
      spreadSeries.map((point) => ({
        timestamp: point.timestamp,
        value: point.spread,
      })),
    [spreadSeries],
  );

  useEffect(() => {
    setSelectedArchiveTime(latestArchiveTime);
  }, [latestArchiveTime]);

  return (
    <section className="temp-insights" aria-labelledby={HISTORY_HEADING_ID}>
      <h2 id={HISTORY_HEADING_ID} className="kern-heading-large">
        {t("insights.heading")}
      </h2>
      <p className="kern-body kern-body--muted">{t("insights.intro")}</p>
      {selectedArchiveTime != null && (
        <p className="temp-insights__archive-time kern-body kern-body--small">
          <span className="kern-label">{t("insights.selectedArchiveTime")}</span>
          <span>{formatTimestamp(selectedArchiveTime)}</span>
        </p>
      )}

      {mostVolatile && (
        <div className="temp-insights__volatile">
          <span className="kern-label">{t("insights.volatile.label")}</span>
          <p className="kern-body">
            {t("insights.volatile.body", {
              name: mostVolatile.name,
              range: formatValue(mostVolatile.range, UNIT),
              min: formatValue(mostVolatile.min, UNIT),
              max: formatValue(mostVolatile.max, UNIT),
            })}
          </p>
        </div>
      )}

      <HistoryViews
        insights={insights}
        current={current}
        perSensor={perSensor}
        spreadPoints={spreadPoints}
        onSelectedArchiveTimeChange={setSelectedArchiveTime}
      />
    </section>
  );
}

function HistoryViews({
  insights,
  current,
  perSensor,
  spreadPoints,
  onSelectedArchiveTimeChange,
}: {
  insights: TemperatureInsightsData;
  current: TemperatureInsightsData["current"];
  perSensor: TemperatureSensorStats[];
  spreadPoints: TimeSeriesPoint[];
  onSelectedArchiveTimeChange: (time: number | null) => void;
}) {
  const { t } = useTranslation("temperature");
  const [activeTab, setActiveTab] = useState<HistoryTab>("map");

  const tabs = useMemo<HistoryTabDef[]>(
    () => [
      { id: "map", labelKey: "insights.tabs.map" },
      { id: "sensors", labelKey: "insights.tabs.sensors" },
      ...(spreadPoints.length > 0
        ? [{ id: "spread" as const, labelKey: "insights.tabs.spread" }]
        : []),
    ],
    [spreadPoints.length],
  );

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [activeTab, tabs]);

  function selectTab(tab: HistoryTab, focus = false) {
    setActiveTab(tab);
    if (focus) {
      window.requestAnimationFrame(() => {
        document.getElementById(`temp-insights-tab-${tab}`)?.focus();
      });
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectTab(tabs[nextIndex].id, true);
  }

  return (
    <div className="temp-insights-tabs">
      <div
        className="temp-insights-tabs__list"
        role="tablist"
        aria-label={t("insights.tabs.label")}
        onKeyDown={handleTabKeyDown}
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`temp-insights-tab-${tab.id}`}
              type="button"
              className="temp-insights-tabs__tab"
              role="tab"
              aria-selected={selected}
              aria-controls={`temp-insights-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(tab.id)}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      <div
        id={`temp-insights-panel-${activeTab}`}
        className="temp-insights-tabs__panel"
        role="tabpanel"
        aria-labelledby={`temp-insights-tab-${activeTab}`}
      >
        {activeTab === "map" && (
          <HistoricalTemperatureField
            frames={insights.fieldFrames}
            frameIntervalMinutes={insights.fieldFrameIntervalMinutes}
            onSelectedTimeChange={onSelectedArchiveTimeChange}
          />
        )}

        {activeTab === "sensors" && (
          <div className="temp-insights-tabs__content">
            <RankingTable rows={perSensor} cityMean={current?.mean ?? null} />
          </div>
        )}

        {activeTab === "spread" && spreadPoints.length > 0 && (
          <div className="temp-insights__chart">
            <LineChart
              points={spreadPoints}
              unit={UNIT}
              label={t("insights.spreadChart.label")}
              color={SPREAD_COLOR}
            />
          </div>
        )}
      </div>
    </div>
  );
}

type SortKey = "name" | "current" | "min" | "max" | "mean" | "range" | "deviationNow";
type SortDir = "asc" | "desc";

interface ColumnDef {
  key: SortKey;
  labelKey: string;
  isNumeric: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "name", labelKey: "insights.table.sensor", isNumeric: false },
  { key: "current", labelKey: "insights.table.now", isNumeric: true },
  { key: "min", labelKey: "insights.table.min", isNumeric: true },
  { key: "max", labelKey: "insights.table.max", isNumeric: true },
  { key: "mean", labelKey: "insights.table.average", isNumeric: true },
  { key: "range", labelKey: "insights.table.range", isNumeric: true },
  { key: "deviationNow", labelKey: "insights.table.vsCity", isNumeric: true },
];

/** Compare two rows by a column, keeping null isNumeric values last in either direction. */
function compareRows(
  a: TemperatureSensorStats,
  b: TemperatureSensorStats,
  key: SortKey,
  dir: SortDir,
): number {
  if (key === "name") {
    const r = a.name.localeCompare(b.name);
    return dir === "asc" ? r : -r;
  }
  const av = a[key];
  const bv = b[key];
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return dir === "asc" ? av - bv : bv - av;
}

/**
 * Per-sensor ranking table. Split out and memoized so it does not re-render with
 * the parent's other (potentially interactive) children; mirrors the table
 * idiom used by {@link LineChart}'s DataTable. Each column header is a button
 * that sorts the rows; the active column carries `aria-sort` for assistive tech.
 */
const RankingTable = memo(function RankingTable({
  rows,
  cityMean,
}: {
  rows: TemperatureSensorStats[];
  cityMean: number | null;
}) {
  const { t } = useTranslation("temperature");
  // Rows arrive pre-sorted by current temperature, descending.
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "current",
    dir: "desc",
  });

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => compareRows(a, b, sort.key, sort.dir)),
    [rows, sort],
  );

  function toggleSort(key: SortKey, isNumeric: boolean) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: isNumeric ? "desc" : "asc" },
    );
  }

  return (
    <>
      <p
        id={RANKING_CONTEXT_ID}
        className="temp-insights__table-context kern-body kern-body--small kern-body--muted"
      >
        {t("insights.table.unitContext")}
      </p>
      <div
        className="kern-table-responsive table-scroll temp-insights__ranking-scroll"
        role="region"
        aria-label={t("insights.table.scrollLabel")}
        tabIndex={0}
      >
        <table
          className="kern-table kern-table--striped kern-table--small table--sticky-first temp-insights__ranking-table"
          aria-describedby={
            cityMean == null
              ? RANKING_CONTEXT_ID
              : `${RANKING_CONTEXT_ID} ${RANKING_NOTE_ID}`
          }
        >
          <caption className="visually-hidden">{t("insights.table.caption")}</caption>
          <thead>
          <tr className="kern-table__row">
            {COLUMNS.map((col) => {
              const active = sort.key === col.key;
              return (
                <th
                  key={col.key}
                  className={
                    "kern-table__header" +
                    (col.isNumeric ? " kern-table__header--numeric" : "")
                  }
                  scope="col"
                  aria-sort={
                    active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    className="temp-insights__sort"
                    onClick={() => toggleSort(col.key, col.isNumeric)}
                    aria-label={t("insights.table.sortBy", { column: t(col.labelKey) })}
                  >
                    <span>{t(col.labelKey)}</span>
                    <span className="temp-insights__sort-arrow" aria-hidden="true">
                      {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
          </thead>
          <tbody className="kern-table__body">
          {sortedRows.map((row) => (
            <tr className="kern-table__row" key={row.objectId}>
              <th className="kern-table__cell" scope="row">
                {row.name}
              </th>
              <td className="kern-table__cell kern-table__cell--numeric">
                {formatValue(row.current, UNIT)}
              </td>
              <td className="kern-table__cell kern-table__cell--numeric">
                {formatValue(row.min, UNIT)}
              </td>
              <td className="kern-table__cell kern-table__cell--numeric">
                {formatValue(row.max, UNIT)}
              </td>
              <td className="kern-table__cell kern-table__cell--numeric">
                {formatValue(row.mean, UNIT)}
              </td>
              <td className="kern-table__cell kern-table__cell--numeric">
                {formatValue(row.range, UNIT)}
              </td>
              <td className="kern-table__cell kern-table__cell--numeric">
                {formatDeviation(row.deviationNow)}
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
      {cityMean != null && (
        <p id={RANKING_NOTE_ID} className="kern-body kern-body--small kern-body--muted">
          {t("insights.table.note", { value: formatValue(cityMean, UNIT) })}
        </p>
      )}
    </>
  );
});
