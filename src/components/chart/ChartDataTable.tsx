// The text equivalent every chart owes its series (WCAG 1.1.1): a collapsible
// table under the plot, mirroring exactly what is drawn.
//
// Two behaviours are the reason this is one component rather than three copies,
// and both are easy to lose when re-typing the markup: rows are built only once
// the user expands the table, so a chart over thousands of points costs nothing
// on load; and the whole thing is memoized, so hovering the plot — which
// re-renders the chart on every mousemove — never re-formats a row.

import { memo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface ChartDataColumn<T> {
  /** Stable key for React; not shown. */
  key: string;
  header: ReactNode;
  /** Right-aligns the column, for values that are read by magnitude. */
  numeric?: boolean;
  /**
   * Cell contents. `index` is the row's position, which a series stored
   * column-wise (the depth grid's bands) needs to reach its own value.
   */
  render(row: T, index: number): ReactNode;
}

/** Row key for series with no identity of their own beyond their order. */
export const indexRowKey = (_row: unknown, index: number) => index;

interface Props<T> {
  /** Visually-hidden table caption naming the series and its unit. */
  caption: string;
  columns: readonly ChartDataColumn<T>[];
  rows: readonly T[];
  rowKey(row: T, index: number): string | number;
}

function ChartDataTableInner<T>({ caption, columns, rows, rowKey }: Props<T>) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  return (
    <details className="chart__data" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="kern-body">{t("chart.data")}</summary>
      <div className="kern-table-responsive table-scroll">
        <table className="kern-table kern-table--striped kern-table--small">
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr className="kern-table__row">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={
                    "kern-table__header" +
                    (column.numeric ? " kern-table__header--numeric" : "")
                  }
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="kern-table__body">
            {open &&
              rows.map((row, index) => (
                <tr className="kern-table__row" key={rowKey(row, index)}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={
                        "kern-table__cell" +
                        (column.numeric ? " kern-table__cell--numeric" : "")
                      }
                    >
                      {column.render(row, index)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// `memo` erases the type parameter, so the memoized value is re-typed as the
// component it wraps to keep call sites generic.
export const ChartDataTable = memo(ChartDataTableInner) as typeof ChartDataTableInner;
