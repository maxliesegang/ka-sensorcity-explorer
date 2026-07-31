// The chrome the time × value charts draw around their marks: the value grid,
// the axis label, the time endpoints and the cursor line.
//
// What differs between those charts is the marks themselves — a line, a line
// over a band — so those stay in each chart and everything surrounding them
// lives here. All of it is positioned from `utils/chartGeometry`, so a chart
// never repeats the padding arithmetic just to place a label.

import type { ReactNode } from "react";

import {
  CHART_PAD,
  CHART_WIDTH,
  type ChartPadding,
  type TimeValueScale,
} from "../../utils/chartGeometry";
import { formatTimestamp, formatValue } from "../../utils/format";

interface AxisProps {
  height: number;
  pad?: ChartPadding;
  width?: number;
}

/** Horizontal gridlines with their value labels. */
export function ChartValueGrid({
  values,
  scale,
  pad = CHART_PAD,
  width = CHART_WIDTH,
}: {
  values: readonly number[];
  scale: TimeValueScale;
  pad?: ChartPadding;
  width?: number;
}) {
  return (
    <>
      {values.map((value, index) => {
        const y = scale.y(value);
        return (
          <g key={index} className="chart__grid">
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} />
            <text x={pad.left - 6} y={y + 3} textAnchor="end">
              {formatValue(value)}
            </text>
          </g>
        );
      })}
    </>
  );
}

/** The rotated y-axis caption, usually the unit. */
export function ChartAxisLabel({
  label,
  pad = CHART_PAD,
}: {
  label: ReactNode;
  pad?: ChartPadding;
}) {
  return (
    <text x={12} y={pad.top} className="chart__axis" transform={`rotate(-90 12 ${pad.top})`}>
      {label}
    </text>
  );
}

/** First and last timestamp, anchored to the plot's bottom corners. */
export function ChartTimeEndpoints({
  from,
  to,
  height,
  pad = CHART_PAD,
  width = CHART_WIDTH,
}: AxisProps & { from: number; to: number }) {
  return (
    <>
      <text x={pad.left} y={height - 8} className="chart__axis">
        {formatTimestamp(from)}
      </text>
      <text x={width - pad.right} y={height - 8} textAnchor="end" className="chart__axis">
        {formatTimestamp(to)}
      </text>
    </>
  );
}

/** Vertical rule marking the highlighted index. */
export function ChartCursorLine({ x, height, pad = CHART_PAD }: AxisProps & { x: number }) {
  return (
    <line
      className="chart__cursor"
      x1={x}
      x2={x}
      y1={pad.top}
      y2={height - pad.bottom}
    />
  );
}
