// City-wide spread of every depth band at once, as a small table.
//
// The map can only colour one band at a time, so this is where the depth
// structure becomes readable: how the median moves down the column, and how far
// probes disagree at each level. Values stay absolute even while the map is in
// deviation mode — a band's median against another band's baseline would compare
// two different depths — so the caller passes the value scale's colours, which is
// also what makes a row's swatch match the map when the map shows that band.

import { useTranslation } from "react-i18next";

import type { DepthProfile } from "../types";
import { formatSoilValue } from "../utils/soilFieldFormat";
import type { SoilBandStats } from "../utils/soilFieldReadings";

interface Props {
  stats: readonly SoilBandStats[];
  profile: DepthProfile;
  selectedBandIndex: number;
  /** Colour for an absolute reading on the value scale (never the deviation one). */
  getColorForValue: (value: number) => string;
  onBandChange?: (band: number) => void;
}

export function SoilBandSummary({
  stats,
  profile,
  selectedBandIndex,
  getColorForValue,
  onBandChange,
}: Props) {
  const { t } = useTranslation("soil");
  const { t: tc } = useTranslation("common");
  const unitText = profile.unit ? ` (${profile.unit})` : "";
  const format = (value: number) => formatSoilValue(profile, value);

  return (
    <div className="kern-table-responsive table-scroll soil-band-summary">
      <table className="kern-table kern-table--striped kern-table--small">
        <caption className="kern-body kern-body--small kern-body--muted">
          {t("bands.caption")}
        </caption>
        <thead>
          <tr className="kern-table__row">
            <th className="kern-table__header" scope="col">
              {tc("depth.label")}
            </th>
            <th className="kern-table__header kern-table__header--numeric" scope="col">
              {t("bands.median")}
              {unitText}
            </th>
            <th className="kern-table__header kern-table__header--numeric" scope="col">
              {t("bands.range")}
              {unitText}
            </th>
            <th className="kern-table__header kern-table__header--numeric" scope="col">
              {t("bands.probes")}
            </th>
          </tr>
        </thead>
        <tbody className="kern-table__body">
          {stats.map((band) => (
            <tr
              className={
                "kern-table__row" +
                (band.bandIndex === selectedBandIndex ? " soil-band-row--current" : "")
              }
              key={band.band}
              onClick={() => onBandChange?.(band.band)}
              tabIndex={onBandChange ? 0 : undefined}
              onKeyDown={
                onBandChange
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onBandChange(band.band);
                      }
                    }
                  : undefined
              }
            >
              <th className="kern-table__header" scope="row">
                <span
                  className="cat-dot"
                  style={{ background: getColorForValue(band.median) }}
                  aria-hidden="true"
                />
                {tc("depth.band", { band: band.band })}
                {band.bandIndex === selectedBandIndex && (
                  <span className="kern-body kern-body--small kern-body--muted">
                    {` ${t("bands.onMap")}`}
                  </span>
                )}
              </th>
              <td className="kern-table__cell kern-table__cell--numeric">
                {format(band.median)}
              </td>
              <td className="kern-table__cell kern-table__cell--numeric">
                {`${format(band.min)} – ${format(band.max)}`}
              </td>
              <td className="kern-table__cell kern-table__cell--numeric">
                {band.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
