import { getDepthProfiles, getUnbandedMeasurements } from "../../utils/sensorMeasurements";
import { DepthReadingsTable } from "./DepthReadingsTable";
import { MeasurementCards } from "./MeasurementCards";
import type { ReadingsPanelProps } from "./types";

/**
 * The display for a probe that samples at stacked depths: its banded families as
 * a depth × quantity table, and whatever else the category measures as cards.
 * The two together cover every measurement exactly once (see
 * {@link getUnbandedMeasurements}).
 *
 * The soil probes today, but the panel reads the bands off the category rather
 * than knowing which type it is drawing, so any category that declares
 * `depthProfiles` lands here on its own.
 */
export function DepthReadings({ sensor, category }: ReadingsPanelProps) {
  return (
    <>
      <DepthReadingsTable sensor={sensor} profiles={getDepthProfiles(category)} />
      <MeasurementCards sensor={sensor} measurements={getUnbandedMeasurements(category)} />
    </>
  );
}
