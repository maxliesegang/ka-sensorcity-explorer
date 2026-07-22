import { useId, useMemo, useState } from "react";
import { KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

import type { TimeSeriesPoint } from "../api/sensorcity";
import { rowsToCsv } from "../utils/csv";
import { downloadTextFile } from "../utils/download";
import { buildHistoryStats } from "../utils/historyStats";
import {
  buildHistoryWindow,
  type HistoryRange,
} from "../utils/historyRange";
import {
  formatSignedDelta,
  formatTimestamp,
  formatValue,
} from "../utils/format";
import { LineChart } from "./LineChart";
import {
  HISTORY_ANALYSIS_MIN_POINTS,
  SensorHistoryAnalysis,
} from "./SensorHistoryAnalysis";
import { Empty } from "./Status";

interface Props {
  points: TimeSeriesPoint[];
  unit?: string;
  label: string;
  color: string;
  sensorName: string;
}

const RANGES: readonly HistoryRange[] = ["day", "week", "month", "all"];

function toFilenameSlug(value: string): string {
  return (
    value.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-|-$/g, "") ||
    "sensor"
  );
}

/** Focusable history workspace: quick answers first, deeper evidence on demand. */
export function SensorHistoryExplorer({
  points,
  unit,
  label,
  color,
  sensorName,
}: Props) {
  const { t } = useTranslation("detail");
  const overviewHeadingId = useId();
  const [range, setRange] = useState<HistoryRange>("week");
  const [windowOffset, setWindowOffset] = useState(0);
  const historyWindow = useMemo(
    () => buildHistoryWindow(points, range, windowOffset),
    [points, range, windowOffset],
  );
  const visiblePoints = historyWindow?.points ?? [];
  const stats = useMemo(() => buildHistoryStats(visiblePoints), [visiblePoints]);

  if (!historyWindow) return null;

  const delta = stats ? stats.latest - stats.first : 0;
  const directionGlyph = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

  function selectRange(nextRange: HistoryRange) {
    setRange(nextRange);
    setWindowOffset(0);
  }

  function downloadCsv() {
    const csv = rowsToCsv([
      ["timestamp", "value", "unit"],
      ...visiblePoints.map((point) => [
        new Date(point.timestamp).toISOString(),
        point.value,
        unit ?? "",
      ]),
    ]);
    downloadTextFile(
      `${toFilenameSlug(sensorName)}-${toFilenameSlug(label)}-${range}.csv`,
      csv,
      "text/csv;charset=utf-8",
    );
  }

  return (
    <div className="history-explorer">
      <section className="history-navigator" aria-label={t("historyControls.aria")}>
        <div className="history-navigator__toolbar">
          <div>
            <span className="kern-label">{t("historyControls.range")}</span>
            <div
              className="segmented-control history-navigator__ranges"
              role="group"
              aria-label={t("historyControls.range")}
            >
              {RANGES.map((candidate) => (
                <button
                  type="button"
                  key={candidate}
                  className={`segmented-control__option${
                    range === candidate ? " segmented-control__option--active" : ""
                  }`}
                  aria-pressed={range === candidate}
                  onClick={() => selectRange(candidate)}
                >
                  {t(`historyControls.ranges.${candidate}`)}
                </button>
              ))}
            </div>
          </div>
          <KernButton
            type="button"
            variant="tertiary"
            className="kern-btn--small"
            icon="download"
            label={t("historyControls.download")}
            disabled={visiblePoints.length === 0}
            onClick={downloadCsv}
          />
        </div>

        <div className="history-navigator__window">
          <KernButton
            type="button"
            variant="tertiary"
            className="kern-btn--small"
            icon="arrow-back"
            label={t("historyControls.earlier")}
            disabled={!historyWindow.hasEarlier}
            onClick={() => setWindowOffset((current) => current + 1)}
          />
          <div className="history-navigator__window-label" aria-live="polite">
            <span className="kern-label">{t("historyControls.selectedWindow")}</span>
            <strong>
              {formatTimestamp(historyWindow.start)} –{" "}
              {formatTimestamp(historyWindow.end)}
            </strong>
            <span className="kern-body kern-body--small kern-body--muted">
              {t("historyControls.showing", {
                visible: visiblePoints.length,
                total: points.length,
              })}
            </span>
            {historyWindow.hasLater && (
              <KernButton
                type="button"
                variant="tertiary"
                className="kern-btn--x-small"
                label={t("historyControls.latest")}
                onClick={() => setWindowOffset(0)}
              />
            )}
          </div>
          <KernButton
            type="button"
            variant="tertiary"
            className="kern-btn--small"
            icon="arrow-forward"
            label={t("historyControls.later")}
            disabled={!historyWindow.hasLater}
            onClick={() => setWindowOffset((current) => Math.max(0, current - 1))}
          />
        </div>
      </section>

      {stats ? (
        <>
          <section
            className="history-overview"
            aria-labelledby={overviewHeadingId}
          >
            <div className="history-overview__heading">
              <h3 id={overviewHeadingId} className="kern-heading-small">
                {t("historySummary.heading")}
              </h3>
              <p className="kern-body kern-body--small kern-body--muted">
                {t("historySummary.intro", {
                  range: t(`historyControls.ranges.${range}`),
                })}
              </p>
            </div>
            <div className="history-overview__cards">
              <div className="pulse-stat history-overview__latest">
                <span className="pulse-stat__value">
                  {formatValue(stats.latest, unit)}
                </span>
                <span className="pulse-stat__label">
                  {t("historySummary.latest")}
                </span>
                <p className="kern-body kern-body--small kern-body--muted">
                  {formatTimestamp(stats.latestAt)}
                </p>
              </div>
              <div className="pulse-stat">
                <span className="pulse-stat__value">
                  <span className="history-overview__arrow" aria-hidden="true">
                    {directionGlyph}
                  </span>{" "}
                  {formatSignedDelta(delta, unit)}
                </span>
                <span className="pulse-stat__label">
                  {t("historySummary.change")}
                </span>
                <p className="kern-body kern-body--small kern-body--muted">
                  {t("historySummary.changeDetail")}
                </p>
              </div>
              <div className="pulse-stat">
                <span className="pulse-stat__value">
                  {formatValue(stats.mean, unit)}
                </span>
                <span className="pulse-stat__label">
                  {t("historySummary.average")}
                </span>
                <p className="kern-body kern-body--small kern-body--muted">
                  {t("historySummary.readingCount", { count: stats.count })}
                </p>
              </div>
              <div className="pulse-stat">
                <span className="pulse-stat__value pulse-stat__value--text">
                  {formatValue(stats.min, unit)} – {formatValue(stats.max, unit)}
                </span>
                <span className="pulse-stat__label">
                  {t("historySummary.range")}
                </span>
                <p className="kern-body kern-body--small kern-body--muted">
                  {t("historySummary.lowToHigh")}
                </p>
              </div>
            </div>
          </section>

          <LineChart points={visiblePoints} unit={unit} label={label} color={color} />

          {stats.count >= HISTORY_ANALYSIS_MIN_POINTS && (
            <details className="history-deep-dive">
              <summary>
                <span>
                  <strong>{t("historyDeepDive.heading")}</strong>
                  <small>{t("historyDeepDive.intro")}</small>
                </span>
              </summary>
              <SensorHistoryAnalysis
                stats={stats}
                unit={unit}
                label={label}
                color={color}
              />
            </details>
          )}
        </>
      ) : (
        <Empty label={t("historyControls.noReadings")} />
      )}
    </div>
  );
}
