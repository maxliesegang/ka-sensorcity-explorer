import { useTranslation } from "react-i18next";

import { useTicker } from "../hooks/useTicker";
import type { Sensor } from "../types";
import { formatTimestamp, timeAgo } from "../utils/format";
import { isRecentlyMeasured } from "../utils/sensorFreshness";

/**
 * Says whether a sensor's headline reading is current or old.
 *
 * A probe that stopped reporting three weeks ago otherwise presents exactly like
 * a live one — same large value, same styling — with only a small relative time
 * to give it away. The badge makes "this number is stale" the first thing read,
 * and stays out of the way when the reading is fresh.
 */
export function SensorFreshnessBadge({
  sensor,
  className,
}: {
  sensor: Pick<Sensor, "measuredAt">;
  className?: string;
}) {
  const { t } = useTranslation();
  const now = useTicker();
  const isFresh = isRecentlyMeasured(sensor, now);
  const hasReading = sensor.measuredAt != null;

  const modifier = !hasReading ? "unknown" : isFresh ? "live" : "stale";
  const label = !hasReading
    ? t("freshness.badge.unknown")
    : isFresh
      ? t("freshness.badge.live")
      : t("freshness.badge.stale", { ago: timeAgo(sensor.measuredAt) });

  return (
    <span
      className={`freshness-badge freshness-badge--${modifier}${
        className ? ` ${className}` : ""
      }`}
      title={hasReading ? formatTimestamp(sensor.measuredAt) : undefined}
    >
      <span className="freshness-badge__dot" aria-hidden="true" />
      <span className="kern-label">{label}</span>
    </span>
  );
}
