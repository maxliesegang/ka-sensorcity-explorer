import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { TimeSeriesPoint } from "../api/sensorcity";
import { nearestIndexFromPointer, useChartCursor } from "../hooks/useChartCursor";
import { buildTimeValueScale, linePath, CHART_WIDTH } from "../utils/chartGeometry";
import { formatTimestamp, formatValue } from "../utils/format";
import {
  ChartAxisLabel,
  ChartCursorLine,
  ChartTimeEndpoints,
  ChartValueGrid,
} from "./chart/ChartChrome";
import {
  ChartDataTable,
  indexRowKey,
  type ChartDataColumn,
} from "./chart/ChartDataTable";

interface Props {
  points: TimeSeriesPoint[];
  unit?: string;
  label?: string;
  color?: string;
  height?: number;
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/** Human description of the time span covered by the series. */
function spanLabel(minX: number, maxX: number, translate: TranslateFn): string {
  const days = Math.round((maxX - minX) / 86_400_000);
  if (days <= 0) return translate("chart.span.underDay");
  if (days < 14) return translate("chart.span.day", { count: days });
  return translate("chart.span.week", { count: Math.round(days / 7) });
}

/**
 * Minimal dependency-free SVG line chart for a time series. Responsive via a
 * viewBox. Accessible: the SVG carries a descriptive label, points can be
 * stepped through with the keyboard, and a collapsible data table provides an
 * equivalent for assistive tech (WCAG 1.1.1, 2.1.1).
 */
export function LineChart({
  points,
  unit,
  label,
  color = "#1f77b4",
  height = 240,
}: Props) {
  const { t: translate } = useTranslation("common");
  const seriesLabel = label ?? translate("chart.measurement");
  const { index: hover, setIndex: setHover, svgProps } = useChartCursor(points.length);
  const describedById = useId();

  const model = useMemo(() => {
    if (points.length === 0) return null;
    const xs = points.map((p) => p.timestamp);
    const ys = points.map((p) => p.value);
    const extent = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
    const scale = buildTimeValueScale(extent, height);
    const screen = points.map((p) => ({
      x: scale.x(p.timestamp),
      y: scale.y(p.value),
      p,
    }));

    return {
      ...extent,
      scale,
      screen,
      // Mark positions, for hit-testing the pointer in the SVG's own space.
      markXs: screen.map((s) => s.x),
      path: linePath(screen),
      ticks: [extent.maxY, (extent.maxY + extent.minY) / 2, extent.minY],
    };
  }, [points, height]);

  const columns = useMemo<ChartDataColumn<TimeSeriesPoint>[]>(
    () => [
      {
        key: "time",
        header: translate("chart.time"),
        render: (point) => formatTimestamp(point.timestamp),
      },
      {
        key: "value",
        header: `${translate("chart.valueHeader")}${unit ? ` ${unit}` : ""}`,
        numeric: true,
        render: (point) => formatValue(point.value, unit),
      },
    ],
    [translate, unit],
  );

  if (!model) return null;

  const active = hover != null ? model.screen[hover] : null;
  const span = spanLabel(model.minX, model.maxX, translate);
  const description = translate("chart.desc", {
    label: seriesLabel,
    span,
    count: points.length,
    min: formatValue(model.minY, unit),
    max: formatValue(model.maxY, unit),
    from: formatTimestamp(model.minX),
    to: formatTimestamp(model.maxX),
  });

  return (
    <figure className="chart">
      <div className="chart__header">
        <div>
          <span className="kern-label">{seriesLabel}</span>
          <p className="kern-body kern-body--small kern-body--muted">
            {translate("chart.pointsOver", { count: points.length, span })}
          </p>
        </div>
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
        <ChartAxisLabel label={unit || label} />

        <path d={model.path} fill="none" stroke={color} strokeWidth={2.5} />

        {model.screen.length === 1 && (
          <circle cx={model.screen[0].x} cy={model.screen[0].y} r={4} fill={color} />
        )}

        <ChartTimeEndpoints from={model.minX} to={model.maxX} height={height} />

        {active && (
          <g>
            <ChartCursorLine x={active.x} height={height} />
            <circle cx={active.x} cy={active.y} r={3} fill={color} />
          </g>
        )}
      </svg>

      <figcaption className="chart__caption">
        {active
          ? translate("chart.pointAt", {
              time: formatTimestamp(active.p.timestamp),
              value: formatValue(active.p.value, unit),
            })
          : `${translate("chart.pointsOver", { count: points.length, span })} · ${translate("chart.stepHint")}`}
      </figcaption>

      <p id={describedById} className="visually-hidden">
        {description}
      </p>
      <ChartDataTable
        caption={`${seriesLabel} history${unit ? ` (${unit})` : ""}`}
        columns={columns}
        rows={points}
        rowKey={indexRowKey}
      />
    </figure>
  );
}
