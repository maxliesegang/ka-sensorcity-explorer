import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { TimeSeriesPoint } from "../api/sensorcity";
import { formatValue } from "../utils/format";
import {
  computeHistoryStats,
  type HistoryStats,
  type HourlyAverage,
} from "../utils/historyStats";

interface Props {
  points: TimeSeriesPoint[];
  unit?: string;
  label?: string;
  color?: string;
}

const DEFAULT_COLOR = "#1f77b4";
const HEADING_ID = "history-analysis-heading";

// Below this many points the averages, volatility and diurnal shape aren't
// meaningful, so the analysis defers entirely to the parent's line chart.
const MIN_POINTS = 3;

/** Trend arrow glyph for each direction; decorative (paired with text). */
const TREND_GLYPH: Record<HistoryStats["trend"]["direction"], string> = {
  up: "↑",
  down: "↓",
  steady: "→",
};

/**
 * One KPI card derived from {@link HistoryStats}. Adding a headline stat is a
 * single entry here — the grid renders whatever this list describes.
 */
interface StatCard {
  labelKey: string;
  value: number;
  detail?: string;
}

/**
 * Presentational historical analysis for a single sensor measurement's time
 * series. The single-sensor analog of {@link TemperatureInsights}: it performs
 * no fetching — points arrive as props and all statistics are computed
 * synchronously via {@link computeHistoryStats}. The parent owns the line chart
 * and loading/empty/error states; this renders nothing (returns null) for empty
 * or low-sample series.
 */
export function SensorHistoryAnalysis({ points, unit, label, color }: Props) {
  const { t } = useTranslation("detail");
  const stats = useMemo(() => computeHistoryStats(points), [points]);

  if (!stats || stats.count < MIN_POINTS) return null;

  const cards: StatCard[] = [
    {
      labelKey: "analysis.kpi.average",
      value: stats.mean,
      detail: t("analysis.kpi.averageDetail", { count: stats.count }),
    },
    { labelKey: "analysis.kpi.min", value: stats.min },
    { labelKey: "analysis.kpi.max", value: stats.max },
    { labelKey: "analysis.kpi.range", value: stats.range },
    { labelKey: "analysis.kpi.volatility", value: stats.stdDev },
  ];

  const direction = stats.trend.direction;
  const trendText = t(`analysis.trend.${direction}`, {
    delta: formatValue(Math.abs(stats.trend.delta), unit),
  });

  return (
    <section className="temp-insights history-analysis" aria-labelledby={HEADING_ID}>
      <h3 id={HEADING_ID} className="kern-heading-small">
        {t("analysis.heading")}
      </h3>

      <div className="temp-insights__kpis">
        {cards.map((card) => (
          <div className="pulse-stat" key={card.labelKey}>
            <span className="pulse-stat__value">{formatValue(card.value, unit)}</span>
            <span className="kern-label">{t(card.labelKey)}</span>
            {card.detail && (
              <p className="kern-body kern-body--small kern-body--muted">{card.detail}</p>
            )}
          </div>
        ))}
      </div>

      <div className="temp-insights__volatile history-analysis__trend">
        <p className="kern-body">
          <span className="history-analysis__trend-arrow" aria-hidden="true">
            {TREND_GLYPH[direction]}
          </span>{" "}
          {trendText}
        </p>
      </div>

      <DiurnalChart
        hourly={stats.hourly}
        peak={stats.peakHour}
        trough={stats.troughHour}
        unit={unit}
        label={label}
        color={color ?? DEFAULT_COLOR}
      />
    </section>
  );
}

// Diurnal bar-chart geometry. A viewBox makes the SVG responsive (it scales to
// its container), mirroring LineChart's approach.
const CHART = { width: 720, height: 160 };
const PAD = { top: 12, right: 12, bottom: 24, left: 12 };
const HOURS_PER_DAY = 24;
// Hours we attempt to label on the X axis (only those actually present render).
const HOUR_TICKS = [0, 6, 12, 18, 23];
const MIN_DIURNAL_HOURS = 2;

interface DiurnalProps {
  hourly: HourlyAverage[];
  peak: HourlyAverage | null;
  trough: HourlyAverage | null;
  unit?: string;
  label?: string;
  color: string;
}

/**
 * Average-by-hour-of-day bar chart. Each bar sits in a fixed clock slot (0..23)
 * so spacing stays true to the time of day even when some hours have no
 * readings; bar heights scale against the spread of the *hourly means* so the
 * daily shape fills the available height. Built as its own component (like
 * LineChart's DataTable) to keep the analysis section readable.
 */
function DiurnalChart({ hourly, peak, trough, unit, label, color }: DiurnalProps) {
  const { t } = useTranslation("detail");

  const model = useMemo(() => {
    if (hourly.length < MIN_DIURNAL_HOURS) return null;

    const means = hourly.map((h) => h.mean);
    const lo = Math.min(...means);
    const span = Math.max(...means) - lo || 1;

    const plotW = CHART.width - PAD.left - PAD.right;
    const plotH = CHART.height - PAD.top - PAD.bottom;
    const slot = plotW / HOURS_PER_DAY;
    const barWidth = Math.max(2, slot * 0.7);
    const baseline = CHART.height - PAD.bottom;
    const slotCenter = (hour: number) => PAD.left + hour * slot + slot / 2;

    const bars = hourly.map((h) => {
      const height = Math.max(1, ((h.mean - lo) / span) * plotH);
      return {
        hour: h.hour,
        mean: h.mean,
        x: slotCenter(h.hour) - barWidth / 2,
        y: baseline - height,
        width: barWidth,
        height,
      };
    });

    const present = new Set(hourly.map((h) => h.hour));
    const ticks = HOUR_TICKS.filter((hour) => present.has(hour)).map((hour) => ({
      hour,
      x: slotCenter(hour),
    }));

    return { bars, ticks, baseline };
  }, [hourly]);

  if (!model || !peak || !trough) return null;

  return (
    <figure className="chart history-analysis__diurnal">
      <div className="chart__header">
        <span className="kern-label">{t("analysis.diurnal.heading")}</span>
      </div>
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="chart__svg"
        role="img"
        aria-label={t("analysis.diurnal.aria", { label: label ?? "" })}
        style={{ color }}
      >
        <line
          className="chart__grid"
          x1={PAD.left}
          x2={CHART.width - PAD.right}
          y1={model.baseline}
          y2={model.baseline}
          stroke="currentColor"
        />
        {model.bars.map((bar) => (
          <rect
            key={bar.hour}
            className="history-analysis__bar"
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
          >
            <title>{`${bar.hour}:00 — ${formatValue(bar.mean, unit)}`}</title>
          </rect>
        ))}
        {model.ticks.map((tick) => (
          <text
            key={tick.hour}
            x={tick.x}
            y={CHART.height - 6}
            textAnchor="middle"
            className="chart__axis"
          >
            {`${tick.hour}h`}
          </text>
        ))}
      </svg>
      <figcaption className="chart__caption">
        {t("analysis.diurnal.caption", {
          peak: peak.hour,
          peakValue: formatValue(peak.mean, unit),
          trough: trough.hour,
          troughValue: formatValue(trough.mean, unit),
        })}
      </figcaption>
      <p className="visually-hidden">{t("analysis.diurnal.summary")}</p>
    </figure>
  );
}
