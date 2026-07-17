import { useTranslation } from "react-i18next";

import { measurementLabelKey } from "../../config/layers";
import type { Measurement, Sensor } from "../../types";
import { formatValue } from "../../utils/format";

interface Props {
  sensor: Sensor;
  measurements: Measurement[];
}

/**
 * One labelled card per measurement — the plain "here are the numbers" display,
 * and the building block panels reach for unless their type reads better some
 * other way. Renders nothing when there is nothing to show, so panels can pass a
 * possibly-empty list without guarding.
 */
export function MeasurementCards({ sensor, measurements }: Props) {
  const { t } = useTranslation("common");

  if (measurements.length === 0) return null;

  return (
    <div className="reading-grid reading-grid--featured">
      {measurements.map((m) => (
        <div className="reading-card" key={m.field}>
          <span className="reading-card__label">{t(measurementLabelKey(m.field))}</span>
          <span className="reading-card__value">
            {formatValue(sensor.attributes[m.field], m.unit)}
          </span>
        </div>
      ))}
    </div>
  );
}
