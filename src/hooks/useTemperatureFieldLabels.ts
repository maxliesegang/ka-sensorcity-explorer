// The text a temperature map's per-cell value label shows, in either display
// mode. Keeping the formatters together keeps the live and historical maps
// consistent; the on/off state they share with the other fields lives in
// useFieldLabelVisibility.

import { formatSignedDelta } from "../utils/format";

const UNIT = "°C";

/** Temperature-mode label, e.g. "21.4 °C". */
export function formatTemperatureLabel(temperature: number): string {
  return `${temperature.toFixed(1)} ${UNIT}`;
}

/** Deviation-mode label (Δ from the baseline), e.g. "+1.3 °C". */
export function formatTemperatureDeviationLabel(delta: number): string {
  return formatSignedDelta(delta, UNIT);
}
