import { memo, useId, useMemo, useState } from "react";
import { KernBadge } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

import type { TimeSeriesPoint } from "../api/sensorcity";
import { useChartCursor } from "../hooks/useChartCursor";
import { formatTimestamp, formatValue } from "../utils/format";

interface Props {
  points: TimeSeriesPoint[];
  unit?: string;
  label?: string;
  color?: string;
  height?: number;
}

const PAD = { top: 12, right: 12, bottom: 26, left: 48 };

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
 * stepped through with the keyboard, and a visually-hidden data table provides
 * an equivalent for assistive tech (WCAG 1.1.1, 2.1.1).
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
  const width = 720;
  const { index: hover, setIndex: setHover, svgProps } = useChartCursor(points.length);
  const describedById = useId();

  const model = useMemo(() => {
    if (points.length === 0) return null;
    const xs = points.map((p) => p.timestamp);
    const ys = points.map((p) => p.value);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const plotW = width - PAD.left - PAD.right;
    const plotH = height - PAD.top - PAD.bottom;

    const sx = (timestamp: number) =>
      PAD.left + ((timestamp - minX) / spanX) * plotW;
    const sy = (value: number) =>
      PAD.top + (1 - (value - minY) / spanY) * plotH;

    const screen = points.map((p) => ({ x: sx(p.timestamp), y: sy(p.value), p }));
    const path = screen
      .map((s, i) => `${i === 0 ? "M" : "L"}${s.x.toFixed(1)},${s.y.toFixed(1)}`)
      .join(" ");

    return { screen, path, minX, maxX, minY, maxY, sy };
  }, [points, height]);

  if (!model) return null;

  const ticks = [model.maxY, (model.maxY + model.minY) / 2, model.minY];
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

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!model) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bestDist = Infinity;
    model.screen.forEach((s, i) => {
      const d = Math.abs(s.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  }

  return (
    <figure className="chart">
      <div className="chart__header">
        <div>
          <span className="kern-label">{seriesLabel}</span>
          <p className="kern-body kern-body--small kern-body--muted">
            {translate("chart.pointsOver", { count: points.length, span })}
          </p>
        </div>
        <KernBadge
          label={unit || translate("chart.value")}
          variant="info"
          className="kern-badge--small"
        />
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart__svg"
        role="img"
        aria-label={description}
        aria-describedby={describedById}
        onMouseMove={onMove}
        {...svgProps}
      >
        {ticks.map((tickValue, index) => {
          const y = model.sy(tickValue);
          return (
            <g key={index} className="chart__grid">
              <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end">
                {formatValue(tickValue)}
              </text>
            </g>
          );
        })}

        <text
          x={12}
          y={PAD.top}
          className="chart__axis"
          transform={`rotate(-90 12 ${PAD.top})`}
        >
          {unit || label}
        </text>

        <path d={model.path} fill="none" stroke={color} strokeWidth={2.5} />

        {model.screen.length === 1 && (
          <circle
            cx={model.screen[0].x}
            cy={model.screen[0].y}
            r={4}
            fill={color}
          />
        )}

        <text x={PAD.left} y={height - 8} className="chart__axis">
          {formatTimestamp(model.minX)}
        </text>
        <text
          x={width - PAD.right}
          y={height - 8}
          textAnchor="end"
          className="chart__axis"
        >
          {formatTimestamp(model.maxX)}
        </text>

        {active && (
          <g>
            <line
              className="chart__cursor"
              x1={active.x}
              x2={active.x}
              y1={PAD.top}
              y2={height - PAD.bottom}
            />
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
      <SeriesDataTable points={points} unit={unit} seriesLabel={seriesLabel} />
    </figure>
  );
}

/**
 * Visually-hidden / collapsible data table mirroring the series. Memoized and
 * split out from {@link LineChart} so that hovering — which updates the chart's
 * cursor on every mousemove — does not re-render these (up to thousands of) rows
 * and re-run an `Intl.DateTimeFormat` per row.
 */
const SeriesDataTable = memo(function SeriesDataTable({
  points,
  unit,
  seriesLabel,
}: {
  points: TimeSeriesPoint[];
  unit?: string;
  seriesLabel: string;
}) {
  const { t } = useTranslation("common");
  // Render the (potentially thousands of) rows only once the user expands the
  // table, so the heavy DOM + per-row date formatting never hits initial load.
  const [open, setOpen] = useState(false);
  const unitText = unit ? ` ${unit}` : "";
  return (
    <details
      className="chart__data"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="kern-body">{t("chart.data")}</summary>
      <div className="kern-table-responsive table-scroll">
        <table className="kern-table kern-table--striped kern-table--small">
          <caption className="visually-hidden">
            {`${seriesLabel} history${unitText ? ` (${unit})` : ""}`}
          </caption>
          <thead>
            <tr className="kern-table__row">
              <th className="kern-table__header" scope="col">{t("chart.time")}</th>
              <th className="kern-table__header kern-table__header--numeric" scope="col">
                {t("chart.valueHeader")}{unitText}
              </th>
            </tr>
          </thead>
          <tbody className="kern-table__body">
            {open &&
              points.map((p, i) => (
                <tr className="kern-table__row" key={i}>
                  <td className="kern-table__cell">{formatTimestamp(p.timestamp)}</td>
                  <td className="kern-table__cell kern-table__cell--numeric">
                    {formatValue(p.value, unit)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>
  );
});
