import { useTranslation } from "react-i18next";

interface Props {
  gradient: string;
  minLabel: string;
  maxLabel: string;
  caption: string;
  /** Optional label for the Δ=0 (baseline) point on the diverging deviation
   * scale, e.g. "0 °C". Only shown when `midPos` is also given. */
  midLabel?: string;
  /** Position of `midLabel` along the bar, 0..1. When set, the label and a tick
   * are placed proportionally (the 0 point is rarely centred on this scale). */
  midPos?: number | null;
}

export function TemperatureLegend({
  gradient,
  minLabel,
  maxLabel,
  caption,
  midLabel,
  midPos,
}: Props) {
  const { t } = useTranslation("temperature");
  const showMid =
    midLabel != null && typeof midPos === "number" && midPos > 0 && midPos < 1;
  const midLeft = showMid ? `${(midPos as number) * 100}%` : undefined;

  return (
    <div className="temp-legend">
      <div className="temp-legend__bar-wrap">
        <div
          className="temp-legend__bar"
          style={{ background: gradient }}
          aria-hidden="true"
        />
        {showMid && (
          <span
            className="temp-legend__tick"
            style={{ left: midLeft }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="temp-legend__scale">
        <span className="kern-body kern-body--small">
          <span className="temp-legend__end">{t("legend.cooler")}</span>
          {minLabel}
        </span>
        {showMid && (
          <span
            className="kern-body kern-body--small temp-legend__scale-mid"
            style={{ left: midLeft }}
          >
            {midLabel}
          </span>
        )}
        <span className="kern-body kern-body--small temp-legend__scale-end">
          {maxLabel}
          <span className="temp-legend__end">{t("legend.warmer")}</span>
        </span>
      </div>
      <div className="temp-legend__caption">
        <span className="kern-body kern-body--small">{caption}</span>
      </div>
    </div>
  );
}
