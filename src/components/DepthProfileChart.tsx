import { memo, useId, useMemo, useState } from "react";
import { KernBadge } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

import { useChartCursor } from "../hooks/useChartCursor";
import type { DepthProfile } from "../types";
import type { DepthProfileGrid } from "../utils/depthProfile";
import { buildDepthProfileScale } from "../utils/depthProfileScale";
import { formatTimestamp, formatValue } from "../utils/format";

interface Props {
  grid: DepthProfileGrid;
  profile: DepthProfile;
  label: string;
  height?: number;
}

// Wider left gutter than the line chart: this axis carries band labels, not numbers.
const PAD = { top: 12, right: 12, bottom: 26, left: 64 };
// Cells tile seamlessly in both directions. Bands sample a continuum, just as
// columns do, so a spacer between them buys no clarity — the axis labels already
// separate the rows — and on a dark surface it reads as a black bar cutting
// through the data. The half-pixel bleed hides rounding seams between rects.
const CELL_BLEED = 0.5;

/**
 * Depth-vs-time heatmap for one banded measurement family: a row per depth band,
 * a column per time bucket, colour for the reading. Accessible on the same terms
 * as the line chart — a described SVG, keyboard stepping through time, and an
 * equivalent data table (WCAG 1.1.1, 2.1.1).
 */
export function DepthProfileChart({ grid, profile, label, height = 260 }: Props) {
  const { t } = useTranslation("common");
  const width = 720;
  const { index: cursor, setIndex: setCursor, svgProps } = useChartCursor(grid.columns.length);
  const descriptionId = useId();

  const model = useMemo(() => {
    const plotW = width - PAD.left - PAD.right;
    const plotH = height - PAD.top - PAD.bottom;
    const columnW = plotW / grid.columns.length;
    const bandH = plotH / grid.bands.length;
    const scale = buildDepthProfileScale(profile.ramp, grid.min, grid.max);
    return {
      plotW,
      plotH,
      columnW,
      bandH,
      scale,
      cellW: columnW + CELL_BLEED,
      cellH: bandH + CELL_BLEED,
      // Only explain the neutral cells on the charts that actually have them.
      hasGaps: grid.bands.some((band) => band.cells.some((cell) => cell == null)),
    };
  }, [grid, profile.ramp, height]);

  const summary = t("chart.profile.summary", {
    bands: grid.bands.length,
    count: grid.rowCount,
    span: t("chart.profile.span", {
      from: formatTimestamp(grid.from),
      to: formatTimestamp(grid.to),
    }),
  });
  const description = t("chart.profile.desc", {
    label,
    bands: grid.bands.length,
    count: grid.rowCount,
    min: formatValue(grid.min, profile.unit),
    max: formatValue(grid.max, profile.unit),
    from: formatTimestamp(grid.from),
    to: formatTimestamp(grid.to),
  });

  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width - PAD.left;
    const column = Math.floor(x / model.columnW);
    setCursor(
      column >= 0 && column < grid.columns.length ? column : null,
    );
  }

  return (
    <figure className="chart depth-profile">
      <div className="chart__header">
        <div>
          <span className="kern-label">{label}</span>
          <p className="kern-body kern-body--small kern-body--muted">{summary}</p>
        </div>
        <div className="depth-profile__legend">
          <KernBadge
            label={profile.unit || t("chart.value")}
            variant="info"
            className="kern-badge--small"
          />
          <div className="depth-profile__legend-scale">
            <span className="kern-body kern-body--small">
              {formatValue(grid.min)}
            </span>
            <span
              className="depth-profile__legend-bar"
              style={{ background: model.scale.gradient }}
              aria-hidden="true"
            />
            <span className="kern-body kern-body--small">
              {formatValue(grid.max)}
            </span>
          </div>
          {model.hasGaps && (
            <span className="depth-profile__legend-note">
              <span className="depth-profile__gap-swatch" aria-hidden="true" />
              <span className="kern-body kern-body--small kern-body--muted">
                {t("chart.profile.noReading")}
              </span>
            </span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart__svg"
        role="img"
        aria-label={description}
        aria-describedby={descriptionId}
        onMouseMove={onMove}
        {...svgProps}
      >
        {grid.bands.map((band, bandIndex) => {
          const y = PAD.top + bandIndex * model.bandH;
          return (
            <g key={band.field}>
              <text
                x={PAD.left - 8}
                y={y + model.bandH / 2 + 3}
                textAnchor="end"
                className="chart__axis"
              >
                {t("depth.band", { band: band.band })}
              </text>
              {band.cells.map((value, column) => (
                // A gap is drawn, not skipped. Left unpainted it would expose
                // the page behind the plot, which reads as a hole torn in the
                // chart rather than as "the probe reported nothing here" — and
                // on the dark surface it reads as a black bar. Its fill comes
                // from CSS, not the ramp, so unlike the scale it can follow the
                // theme.
                <rect
                  key={column}
                  className={value == null ? "depth-profile__gap" : undefined}
                  x={PAD.left + column * model.columnW}
                  y={y}
                  width={model.cellW}
                  height={model.cellH}
                  fill={value == null ? undefined : model.scale.css(value)}
                />
              ))}
            </g>
          );
        })}

        {/* Centred on the plot rather than pinned to its top corner, so the
            word can't run off the top edge the way a longer label would. */}
        <text
          x={12}
          y={PAD.top + model.plotH / 2}
          textAnchor="middle"
          className="chart__axis"
          transform={`rotate(-90 12 ${PAD.top + model.plotH / 2})`}
        >
          {t("depth.label")}
        </text>

        <text x={PAD.left} y={height - 8} className="chart__axis">
          {formatTimestamp(grid.from)}
        </text>
        <text
          x={width - PAD.right}
          y={height - 8}
          textAnchor="end"
          className="chart__axis"
        >
          {formatTimestamp(grid.to)}
        </text>

        {cursor != null && (
          <line
            className="chart__cursor"
            x1={PAD.left + (cursor + 0.5) * model.columnW}
            x2={PAD.left + (cursor + 0.5) * model.columnW}
            y1={PAD.top}
            y2={height - PAD.bottom}
          />
        )}
      </svg>

      <figcaption className="chart__caption">
        {cursor == null ? (
          `${summary} · ${t("chart.profile.stepHint")}`
        ) : (
          <ColumnReadout grid={grid} column={cursor} unit={profile.unit} />
        )}
      </figcaption>

      <p id={descriptionId} className="visually-hidden">
        {description}
      </p>
      <ProfileDataTable grid={grid} unit={profile.unit} seriesLabel={label} />
    </figure>
  );
}

/**
 * The hovered column read out as a depth profile — every band at one moment,
 * which is the question this chart exists to answer.
 */
function ColumnReadout({
  grid,
  column,
  unit,
}: {
  grid: DepthProfileGrid;
  column: number;
  unit?: string;
}) {
  const { t } = useTranslation("common");
  const readings = grid.bands
    .map((band) => {
      const value = band.cells[column];
      return t("chart.profile.reading", {
        band: band.band,
        value: value == null ? t("chart.profile.noReading") : formatValue(value, unit),
      });
    })
    .join(" · ");

  return <>{`${formatTimestamp(grid.columns[column].from)} — ${readings}`}</>;
}

/**
 * Visually-hidden / collapsible table mirroring the grid: a row per time column,
 * a column per band. Memoized and rendered only once expanded, for the same
 * reason as the line chart's — hovering must not re-format every cell.
 */
const ProfileDataTable = memo(function ProfileDataTable({
  grid,
  unit,
  seriesLabel,
}: {
  grid: DepthProfileGrid;
  unit?: string;
  seriesLabel: string;
}) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const unitText = unit ? ` (${unit})` : "";

  return (
    <details
      className="chart__data"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="kern-body">{t("chart.data")}</summary>
      <div className="kern-table-responsive table-scroll">
        <table className="kern-table kern-table--striped kern-table--small">
          <caption className="visually-hidden">
            {`${seriesLabel}${unitText}`}
          </caption>
          <thead>
            <tr className="kern-table__row">
              <th className="kern-table__header" scope="col">
                {t("chart.time")}
              </th>
              {grid.bands.map((band) => (
                <th
                  className="kern-table__header kern-table__header--numeric"
                  scope="col"
                  key={band.field}
                >
                  {t("depth.band", { band: band.band })}
                  {unitText}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="kern-table__body">
            {open &&
              grid.columns.map((column, index) => (
                <tr className="kern-table__row" key={index}>
                  <td className="kern-table__cell">
                    {formatTimestamp(column.from)}
                  </td>
                  {grid.bands.map((band) => {
                    const value = band.cells[index];
                    return (
                      <td
                        className="kern-table__cell kern-table__cell--numeric"
                        key={band.field}
                      >
                        {value == null ? "—" : formatValue(value, unit)}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>
  );
});
