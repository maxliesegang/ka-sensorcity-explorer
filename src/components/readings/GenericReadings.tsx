import { getUnbandedMeasurements } from "../../utils/sensorMeasurements";
import { MeasurementCards } from "./MeasurementCards";
import type { ReadingsPanelProps } from "./types";

/**
 * The display a sensor type gets unless its shape earns it another: a card per
 * measurement. A category the config grows tomorrow renders here without
 * touching this folder.
 *
 * Banded measurements are left out rather than flattened into cards — a matrix
 * of one quantity × N depths read as N unrelated numbers is the misreading
 * {@link DepthReadings} exists to prevent, and no display should fall back to
 * it. A category with no bands, which is every category routed here, has nothing
 * banded to leave out.
 */
export function GenericReadings({ sensor, category }: ReadingsPanelProps) {
  return (
    <MeasurementCards sensor={sensor} measurements={getUnbandedMeasurements(category)} />
  );
}
