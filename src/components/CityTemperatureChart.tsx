// City-wide hourly temperature: the mean across all sensors, drawn over the
// min–max band of the readings behind it.
//
// A sibling of LineChart rather than an option on it: the band is the point
// here, and it needs a second and third value per index that LineChart's
// TimeSeriesPoint has nowhere to put. Everything the two genuinely share — the
// scale, the chrome, the data table — is imported, so what remains below is
// this chart's own marks and wording.

import { useId, useMemo } from "react";
import { KernBadge } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

import type { CityTemperaturePoint } from "../api/temperatureInsights";
import { nearestIndexFromPointer, useChartCursor } from "../hooks/useChartCursor";
import {
  bandPath,
  buildTimeValueScale,
  linePath,
  CHART_WIDTH,
} from "../utils/chartGeometry";
import { formatTimestamp, formatValue } from "../utils/format";
import {
  ChartAxisLabel,
  ChartCursorLine,
  ChartTimeEndpoints,
  ChartValueGrid,
} from "./chart/ChartChrome";
import { ChartDataTable, type ChartDataColumn } from "./chart/ChartDataTable";

const UNIT = "°C";
const MEAN_COLOR = "#2f7d53";
const BAND_COLOR = "#53af78";

const timestampRowKey = (point: CityTemperaturePoint) => point.timestamp;

interface Props {
  points: CityTemperaturePoint[];
  height?: number;
}

/**
 * City-average temperature over time. The parent view owns loading, error and
 * empty states; this renders nothing for an empty series.
 */
export function CityTemperatureChart({ points, height = 260 }: Props) {
  const { t } = useTranslation("temperature");
  const { t: tc } = useTranslation("common");
  const { index: hover, setIndex: setHover, svgProps } = useChartCursor(points.length);
  const describedById = useId();

  const model = useMemo(() => {
    if (points.length === 0) return null;
    // The band sets the vertical extent; the mean is inside it by definition.
    let minY = points[0].min;
    let maxY = points[0].max;
    let totalSamples = 0;
    for (const point of points) {
      if (point.min < minY) minY = point.min;
      if (point.max > maxY) maxY = point.max;
      totalSamples += point.sampleCount;
    }
    const extent = {
      minX: points[0].timestamp,
      maxX: points[points.length - 1].timestamp,
      minY,
      maxY,
    };
    const scale = buildTimeValueScale(extent, height);
    const screen = points.map((point) => ({
      x: scale.x(point.timestamp),
      yMean: scale.y(point.mean),
      yMin: scale.y(point.min),
      yMax: scale.y(point.max),
      point,
    }));

    return {
      ...extent,
      scale,
      screen,
      totalSamples,
      // Mark positions, for hit-testing the pointer in the SVG's own space.
      markXs: screen.map((s) => s.x),
      meanPath: linePath(screen.map((s) => ({ x: s.x, y: s.yMean }))),
      bandPath: bandPath(
        screen.map((s) => ({ x: s.x, y: s.yMax })),
        screen.map((s) => ({ x: s.x, y: s.yMin })),
      ),
      ticks: [maxY, (maxY + minY) / 2, minY],
    };
  }, [points, height]);

  const columns = useMemo<ChartDataColumn<CityTemperaturePoint>[]>(
    () => [
      { key: "time", header: tc("chart.time"), render: (point) => formatTimestamp(point.timestamp) },
      {
        key: "mean",
        header: t("cityAverage.table.mean"),
        numeric: true,
        render: (point) => formatValue(point.mean, UNIT),
      },
      {
        key: "min",
        header: t("cityAverage.table.min"),
        numeric: true,
        render: (point) => formatValue(point.min, UNIT),
      },
      {
        key: "max",
        header: t("cityAverage.table.max"),
        numeric: true,
        render: (point) => formatValue(point.max, UNIT),
      },
      {
        key: "readings",
        header: t("cityAverage.table.readings"),
        numeric: true,
        render: (point) => point.sampleCount,
      },
    ],
    [t, tc],
  );

  if (!model) return null;

  const active = hover != null ? model.screen[hover] : null;
  const description = t("cityAverage.chart.desc", {
    count: points.length,
    min: formatValue(model.minY, UNIT),
    max: formatValue(model.maxY, UNIT),
    from: formatTimestamp(model.minX),
    to: formatTimestamp(model.maxX),
  });

  return (
    <figure className="chart temp-city-chart">
      <div className="chart__header">
        <div>
          <span className="kern-label">{t("cityAverage.chart.label")}</span>
          <p className="kern-body kern-body--small kern-body--muted">
            {t("cityAverage.chart.summary", {
              hours: points.length,
              readings: model.totalSamples,
            })}
          </p>
        </div>
        <KernBadge label={UNIT} variant="info" className="kern-badge--small" />
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        className="chart__svg"
        role="img"
        aria-label={description}
        aria-describedby={describedById}
        onMouseMove={(event) => setHover(nearestIndexFromPointer(event, model.markXs))}
        {...svgProps}
      >
        <ChartValueGrid values={model.ticks} scale={model.scale} />
        <ChartAxisLabel label={UNIT} />

        <path d={model.bandPath} fill={BAND_COLOR} fillOpacity={0.22} stroke="none" />
        <path d={model.meanPath} fill="none" stroke={MEAN_COLOR} strokeWidth={2.5} />

        {model.screen.length === 1 && (
          <circle cx={model.screen[0].x} cy={model.screen[0].yMean} r={4} fill={MEAN_COLOR} />
        )}

        <ChartTimeEndpoints from={model.minX} to={model.maxX} height={height} />

        {active && (
          <g>
            <ChartCursorLine x={active.x} height={height} />
            <line
              className="temp-city-chart__range"
              x1={active.x}
              x2={active.x}
              y1={active.yMax}
              y2={active.yMin}
              stroke={MEAN_COLOR}
            />
            <circle cx={active.x} cy={active.yMean} r={3} fill={MEAN_COLOR} />
          </g>
        )}
      </svg>

      <figcaption className="chart__caption">
        {active
          ? t("cityAverage.chart.pointAt", {
              time: formatTimestamp(active.point.timestamp),
              mean: formatValue(active.point.mean, UNIT),
              min: formatValue(active.point.min, UNIT),
              max: formatValue(active.point.max, UNIT),
              count: active.point.sampleCount,
            })
          : `${t("cityAverage.chart.legend")} · ${tc("chart.stepHint")}`}
      </figcaption>

      <p id={describedById} className="visually-hidden">
        {description}
      </p>
      <ChartDataTable
        caption={t("cityAverage.table.caption")}
        columns={columns}
        rows={points}
        rowKey={timestampRowKey}
      />
    </figure>
  );
}
