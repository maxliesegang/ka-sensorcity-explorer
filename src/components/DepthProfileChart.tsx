import { memo, useId, useMemo, useState } from "react";
import { KernRadioGroup } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

import { useChartCursor } from "../hooks/useChartCursor";
import type { DepthProfile } from "../types";
import type { DepthProfileCell, DepthProfileGrid } from "../utils/depthProfile";
import {
  buildDepthProfileChangeScale,
  buildDepthProfileScale,
  type DepthProfileScale,
} from "../utils/depthProfileScale";
import {
  buildDepthProfileView,
  DEPTH_PROFILE_MODES,
  getDefaultDepthProfileMode,
  isDepthProfileMode,
  type DepthProfileMode,
} from "../utils/depthProfileView";
import { formatSignedDelta, formatTimestamp, formatValue } from "../utils/format";

interface Props {
  grid: DepthProfileGrid;
  profile: DepthProfile;
  label: string;
  height?: number;
}

// Wider left gutter than the line chart: this axis carries band labels, not numbers.
const PAD = { top: 12, right: 12, bottom: 26, left: 64 };
const WIDTH = 720;
// Cells tile seamlessly in both directions. Bands sample a continuum, just as
// columns do, so a spacer between them buys no clarity — the axis labels already
// separate the rows — and on a dark surface it reads as a black bar cutting
// through the data. The half-pixel bleed hides rounding seams between rects.
const CELL_BLEED = 0.5;
// The interpolated-column rail, in the margin between the plot and the time
// axis. It marks *when* values were filled in without putting a mark inside the
// plot: hatching or stippling the cells themselves would defeat the point of
// colouring them from the ramp, which is to leave the eye an unbroken run to
// compare across.
const RAIL = { gap: 4, height: 3 };

interface ChartModel {
  plotH: number;
  columnW: number;
  bandH: number;
  cellW: number;
  cellH: number;
  scale: DepthProfileScale;
  hasGaps: boolean;
  interpolatedColumns: number[];
}

function buildChartModel(
  grid: DepthProfileGrid,
  ramp: DepthProfile["ramp"],
  mode: DepthProfileMode,
  height: number,
): ChartModel {
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const columnW = plotW / grid.columns.length;
  const bandH = plotH / grid.bands.length;
  const scale =
    mode === "development"
      ? buildDepthProfileChangeScale(ramp, grid.min, grid.max)
      : buildDepthProfileScale(ramp, grid.min, grid.max);

  let hasGaps = false;
  const interpolated = Array<boolean>(grid.columns.length).fill(false);
  for (const band of grid.bands) {
    band.cells.forEach((cell, column) => {
      if (cell == null) hasGaps = true;
      else if (cell.isInterpolated) interpolated[column] = true;
    });
  }

  return {
    plotH,
    columnW,
    bandH,
    scale,
    cellW: columnW + CELL_BLEED,
    cellH: bandH + CELL_BLEED,
    hasGaps,
    interpolatedColumns: interpolated.flatMap((value, column) =>
      value ? [column] : [],
    ),
  };
}

/**
 * Depth-vs-time heatmap for one banded measurement family: a row per depth band,
 * a column per time bucket, colour for the reading. Accessible on the same terms
 * as the line chart — a described SVG, keyboard stepping through time, and an
 * equivalent data table (WCAG 1.1.1, 2.1.1).
 */
export function DepthProfileChart({ grid, profile, label, height = 260 }: Props) {
  const { t } = useTranslation("common");
  const [mode, setMode] = useState<DepthProfileMode>(() =>
    getDefaultDepthProfileMode(profile),
  );
  const {
    index: cursor,
    setIndex: setCursor,
    svgProps,
  } = useChartCursor(grid.columns.length);
  const idPrefix = useId().replace(/:/g, "");
  const descriptionId = `${idPrefix}-description`;
  const view = useMemo(() => buildDepthProfileView(grid, mode), [grid, mode]);
  const displayGrid = view.grid;

  const model = useMemo(
    () => buildChartModel(displayGrid, profile.ramp, mode, height),
    [displayGrid, profile.ramp, height, mode],
  );

  const summary = t("chart.profile.summary", {
    bands: displayGrid.bands.length,
    count: displayGrid.rowCount,
    span: t("chart.profile.span", {
      from: formatTimestamp(displayGrid.from),
      to: formatTimestamp(displayGrid.to),
    }),
  });
  const description = t(
    mode === "development"
      ? "chart.profile.descDevelopment"
      : "chart.profile.descAbsolute",
    {
      label,
      bands: displayGrid.bands.length,
      count: displayGrid.rowCount,
      min: formatProfileValue(displayGrid.min, profile.unit, mode),
      max: formatProfileValue(displayGrid.max, profile.unit, mode),
      from: formatTimestamp(displayGrid.from),
      to: formatTimestamp(displayGrid.to),
    },
  );

  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH - PAD.left;
    const column = Math.floor(x / model.columnW);
    setCursor(
      column >= 0 && column < grid.columns.length ? column : null,
    );
  }

  function onModeChange(value: string) {
    if (isDepthProfileMode(value)) setMode(value);
  }

  return (
    <figure className="chart depth-profile">
      <div className="chart__header">
        <KernRadioGroup
          className="depth-profile__modes"
          name={`${idPrefix}-mode`}
          legend={t("chart.profile.mode.label")}
          hint={t(`chart.profile.modeHint.${mode}`)}
          selected={mode}
          horizontal
          items={DEPTH_PROFILE_MODES.map((option) => ({
            id: `${idPrefix}-mode-${option}`,
            value: option,
            label: t(`chart.profile.mode.${option}`),
          }))}
          onChange={onModeChange}
        />
        <div className="depth-profile__legend">
          <span className="kern-label">{t("chart.profile.colorScale")}</span>
          <div className="depth-profile__legend-scale">
            <span className="kern-body kern-body--small">
              {formatProfileValue(model.scale.min, undefined, mode)}
            </span>
            <span
              className="depth-profile__legend-bar"
              style={{ background: model.scale.gradient }}
              aria-hidden="true"
            />
            <span className="kern-body kern-body--small">
              {formatProfileValue(model.scale.max, undefined, mode)}
            </span>
          </div>
          <span className="kern-body kern-body--small kern-body--muted">
            {mode === "development"
              ? `Δ ${profile.unit || t("chart.value")}`
              : profile.unit || t("chart.value")}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="chart__svg"
        role="img"
        aria-label={description}
        aria-describedby={descriptionId}
        onMouseMove={onMove}
        {...svgProps}
      >
        <HeatmapPlot grid={displayGrid} model={model} height={height} />

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
          <ColumnReadout
            grid={displayGrid}
            column={cursor}
            unit={profile.unit}
            mode={mode}
          />
        )}
      </figcaption>

      {(mode === "development" ||
        model.interpolatedColumns.length > 0 ||
        model.hasGaps) && (
          <div className="depth-profile__notes">
            {mode === "development" && (
              <span className="kern-body kern-body--small kern-body--muted">
                {t("chart.profile.medianNote")}
              </span>
            )}
            {model.interpolatedColumns.length > 0 && (
              <span className="depth-profile__legend-note">
                <span
                  className="depth-profile__filled-swatch"
                  aria-hidden="true"
                />
                <span className="kern-body kern-body--small kern-body--muted">
                  {t("chart.profile.interpolated")}
                </span>
              </span>
            )}
            {model.hasGaps && (
              <span className="depth-profile__legend-note">
                <span className="depth-profile__gap-swatch" aria-hidden="true" />
                <span className="kern-body kern-body--small kern-body--muted">
                  {t("chart.profile.noReading")}
                </span>
              </span>
            )}
          </div>
        )}

      <div className="depth-profile__change-summary">
        <span className="kern-label">{t("chart.profile.change24h")}</span>
        <dl>
          {view.changes24h.map((change) => (
            <div key={change.field}>
              <dt>{t("depth.band", { band: change.band })}</dt>
              <dd>
                {change.delta == null
                  ? "—"
                  : formatSignedDelta(change.delta, profile.unit)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p id={descriptionId} className="visually-hidden">
        {description}
      </p>
      <ProfileDataTable
        grid={displayGrid}
        unit={profile.unit}
        seriesLabel={label}
        mode={mode}
      />
    </figure>
  );
}

/**
 * Static SVG layer. Cursor movement re-renders the parent chart frequently, so
 * memoizing the cells and axes avoids rebuilding the full heatmap on each move.
 */
const HeatmapPlot = memo(function HeatmapPlot({
  grid,
  model,
  height,
}: {
  grid: DepthProfileGrid;
  model: ChartModel;
  height: number;
}) {
  const { t } = useTranslation("common");

  return (
    <>
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
            {band.cells.map((cell, column) => (
              // Missing cells use a themed neutral; interpolated cells stay on
              // the ramp and are disclosed by the rail and textual readouts.
              <rect
                key={column}
                className={cell == null ? "depth-profile__gap" : undefined}
                x={PAD.left + column * model.columnW}
                y={y}
                width={model.cellW}
                height={model.cellH}
                fill={cell == null ? undefined : model.scale.css(cell.value)}
              />
            ))}
          </g>
        );
      })}

      {/* Kept outside the plot so interpolation markers do not obscure data. */}
      {model.interpolatedColumns.map((column) => (
        <rect
          key={column}
          className="depth-profile__filled-mark"
          x={PAD.left + column * model.columnW}
          y={PAD.top + model.plotH + RAIL.gap}
          width={model.cellW}
          height={RAIL.height}
        />
      ))}

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
        x={WIDTH - PAD.right}
        y={height - 8}
        textAnchor="end"
        className="chart__axis"
      >
        {formatTimestamp(grid.to)}
      </text>
    </>
  );
});

/**
 * One cell in words, for the readers the rail's colour never reaches — the
 * column readout and the data table. A filled-in value says so on the spot
 * rather than relying on the legend, since both are read cell by cell.
 */
function formatProfileValue(
  value: number,
  unit: string | undefined,
  mode: DepthProfileMode,
): string {
  return mode === "development"
    ? formatSignedDelta(value, unit)
    : formatValue(value, unit);
}

function formatCell(
  cell: DepthProfileCell | null,
  unit: string | undefined,
  mode: DepthProfileMode,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (cell == null) return t("chart.profile.noReading");
  const value = formatProfileValue(cell.value, unit, mode);
  return cell.isInterpolated
    ? t("chart.profile.interpolatedValue", { value })
    : value;
}

/**
 * The hovered column read out as a depth profile — every band at one moment,
 * which is the question this chart exists to answer.
 */
function ColumnReadout({
  grid,
  column,
  unit,
  mode,
}: {
  grid: DepthProfileGrid;
  column: number;
  unit?: string;
  mode: DepthProfileMode;
}) {
  const { t } = useTranslation("common");
  const readings = grid.bands
    .map((band) =>
      t("chart.profile.reading", {
        band: band.band,
        value: formatCell(band.cells[column], unit, mode, t),
      }),
    )
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
  mode,
}: {
  grid: DepthProfileGrid;
  unit?: string;
  seriesLabel: string;
  mode: DepthProfileMode;
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
            {`${seriesLabel} — ${t(`chart.profile.mode.${mode}`)}${unitText}`}
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
                  {grid.bands.map((band) => (
                    <td
                      className="kern-table__cell kern-table__cell--numeric"
                      key={band.field}
                    >
                      {formatCell(band.cells[index], unit, mode, t)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>
  );
});
