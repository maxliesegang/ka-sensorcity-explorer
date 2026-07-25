// The colour-bar legend shared by every map field. It reads the bar off a
// `FieldScale` and everything quantity-specific off props: the end words differ
// per quantity ("Cooler"/"Warmer" for temperature, "Drier"/"Wetter" for soil
// moisture) and so does the number formatting, so both arrive from the view
// rather than being looked up from one namespace here.
//
// The zero tick is not a separate legend variant — it appears when the field is
// showing deviations on a diverging scale, which the scale itself reports via
// `zeroPos`.

import type { FieldScale } from "../utils/fieldScale";

interface Props {
  /** The scale the field is drawing with. Renders nothing until there is one. */
  scale: FieldScale | null;
  /** True when the bar's numbers are differences from a baseline, not readings. */
  isDeviation: boolean;
  /** Render a reading with its unit, e.g. "23.5 °C". */
  formatValue: (value: number) => string;
  /** Render a difference with its unit, e.g. "+1.3 °C". */
  formatDelta: (delta: number) => string;
  /** Word for the low end of the ramp, e.g. "Cooler". */
  minEndLabel: string;
  /** Word for the high end of the ramp, e.g. "Warmer". */
  maxEndLabel: string;
  caption: string;
}

export function FieldLegend({
  scale,
  isDeviation,
  formatValue,
  formatDelta,
  minEndLabel,
  maxEndLabel,
  caption,
}: Props) {
  if (!scale) return null;

  const format = isDeviation ? formatDelta : formatValue;
  // The 0 point is rarely centred on a deviation bar, so the tick and its label
  // are placed proportionally rather than at 50%.
  const { zeroPos } = scale;
  const showZero = isDeviation && zeroPos != null && zeroPos > 0 && zeroPos < 1;
  const zeroLeft = showZero ? `${zeroPos * 100}%` : undefined;

  return (
    <div className="temp-legend">
      <div className="temp-legend__bar-wrap">
        <div
          className="temp-legend__bar"
          style={{ background: scale.gradient }}
          aria-hidden="true"
        />
        {showZero && (
          <span
            className="temp-legend__tick"
            style={{ left: zeroLeft }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="temp-legend__scale">
        <span className="kern-body kern-body--small">
          <span className="temp-legend__end">{minEndLabel}</span>
          {format(scale.min)}
        </span>
        {showZero && (
          <span
            className="kern-body kern-body--small temp-legend__scale-mid"
            style={{ left: zeroLeft }}
          >
            {formatDelta(0)}
          </span>
        )}
        <span className="kern-body kern-body--small temp-legend__scale-end">
          {format(scale.max)}
          <span className="temp-legend__end">{maxEndLabel}</span>
        </span>
      </div>
      <div className="temp-legend__caption">
        <span className="kern-body kern-body--small">{caption}</span>
      </div>
    </div>
  );
}
