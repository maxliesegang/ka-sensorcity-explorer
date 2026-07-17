import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { depthProfileLabelKey } from "../../config/layers";
import type { DepthProfile, Sensor } from "../../types";
import { buildDepthProfileScale } from "../../utils/depthProfileScale";
import { formatValue } from "../../utils/format";
import { getBandNumbers, getReading } from "../../utils/sensorMeasurements";

interface Props {
  sensor: Sensor;
  profiles: DepthProfile[];
}

/**
 * The latest reading of every depth-banded quantity, as a depth × quantity
 * table: one row per band, one column per quantity.
 *
 * A probe's banded fields are a matrix, and one card per field loses that — the
 * soil probe's 12 readings are 6 depths × 2 quantities, and flattened they read
 * as 12 unrelated numbers whose wrap order puts the deepest moisture beside the
 * shallowest temperature. Here each column reads down as a profile, and each row
 * compares the quantities at one depth.
 *
 * Renders nothing without profiles, on the same terms as `MeasurementCards` —
 * callers pass what the category declares without guarding.
 */
export function DepthReadingsTable({ sensor, profiles }: Props) {
  const { t } = useTranslation("common");
  const { t: td } = useTranslation("detail");
  const bandNumbers = useMemo(() => getBandNumbers(profiles), [profiles]);

  // One scale per quantity, over that quantity's own current spread across the
  // bands — the swatch answers "which depths are wetter/warmer right now",
  // which is a comparison within a column, never across them.
  const scales = useMemo(
    () =>
      profiles.map((profile) => {
        const values = profile.bands
          .map((band) => getReading(sensor, band.field))
          .filter((value): value is number => value != null);
        return values.length > 0
          ? buildDepthProfileScale(profile.ramp, Math.min(...values), Math.max(...values))
          : null;
      }),
    [profiles, sensor],
  );

  // After the hooks, never before them.
  if (profiles.length === 0) return null;

  return (
    <div className="kern-table-responsive table-scroll">
      <table className="kern-table kern-table--striped kern-table--small depth-readings">
        <caption className="visually-hidden">{td("profile.tableCaption")}</caption>
        <thead>
          <tr className="kern-table__row">
            <th className="kern-table__header" scope="col">
              {t("depth.label")}
            </th>
            {profiles.map((profile) => (
              <th
                className="kern-table__header kern-table__header--numeric"
                scope="col"
                key={profile.key}
              >
                {t(depthProfileLabelKey(profile.key))}
                {profile.unit ? ` (${profile.unit})` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="kern-table__body">
          {bandNumbers.map((bandNumber) => (
            <tr className="kern-table__row" key={bandNumber}>
              {/* Bare number: the column header already says "Depth". */}
              <th className="kern-table__cell" scope="row">
                {bandNumber}
              </th>
              {profiles.map((profile, index) => {
                // Profiles need not share a band set, so look the field up.
                const field = profile.bands.find((b) => b.band === bandNumber)?.field;
                const value = field != null ? getReading(sensor, field) : null;
                const scale = scales[index];
                return (
                  <td
                    className="kern-table__cell kern-table__cell--numeric"
                    key={profile.key}
                  >
                    {value == null ? (
                      "—"
                    ) : (
                      <span className="depth-readings__value">
                        <span
                          className="depth-readings__swatch"
                          style={{ background: scale?.css(value) }}
                          aria-hidden="true"
                        />
                        {formatValue(value)}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
