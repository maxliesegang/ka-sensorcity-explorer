import type { ComponentType } from "react";

import type { Category, Sensor } from "../../types";

/**
 * What every readings panel receives. Deliberately just the sensor and its
 * resolved category: a panel renders the *body* of the detail view's current
 * readings, while the section chrome around it (heading, last-measured stamp,
 * device facts) is the same for every type and stays in the view.
 */
export interface ReadingsPanelProps {
  sensor: Sensor;
  /** Undefined when the feed reports a category the config doesn't declare. */
  category: Category | undefined;
}

/** One sensor type's current-readings display. See `./panel.ts`. */
export type ReadingsPanel = ComponentType<ReadingsPanelProps>;
