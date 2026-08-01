import type { DepthProfileRamp } from "../types";
import { soilHistoryStatusColor } from "../utils/soilHistoryReference";

interface Props {
  ramp: DepthProfileRamp;
  heading: string;
  lowerLabel: string;
  normalLabel: string;
  higherLabel: string;
  unavailableLabel: string;
  caption: string;
}

export function SoilHistoryGuide({
  ramp,
  heading,
  lowerLabel,
  normalLabel,
  higherLabel,
  unavailableLabel,
  caption,
}: Props) {
  const items = [
    { status: "lower" as const, label: lowerLabel },
    { status: "normal" as const, label: normalLabel },
    { status: "higher" as const, label: higherLabel },
    { status: "unavailable" as const, label: unavailableLabel },
  ];
  return (
    <aside className="soil-history-guide" aria-labelledby="soil-history-guide-heading">
      <div className="soil-history-guide__copy">
        <h2 className="kern-heading-small" id="soil-history-guide-heading">
          {heading}
        </h2>
        <p className="kern-body kern-body--small">{caption}</p>
      </div>
      <div className="soil-history-legend__items">
        {items.map(({ status, label }) => (
          <span className="kern-body kern-body--small" key={status}>
            <span
              className="soil-history-legend__swatch"
              style={{ background: soilHistoryStatusColor(ramp, status) }}
              aria-hidden="true"
            />
            {label}
          </span>
        ))}
      </div>
    </aside>
  );
}
