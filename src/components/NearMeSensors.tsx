import { useMemo, useState } from "react";
import { KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { categoryLabelKey, getCategoryColor } from "../config/layers";
import type { Sensor } from "../types";
import {
  formatDistance,
  getNearestSensors,
  type Coordinates,
} from "../utils/geo";
import { timeAgo } from "../utils/format";
import { formatPrimaryReading } from "../utils/sensorMeasurements";

const NEAREST_COUNT = 3;
/** Give up rather than hang on a fix the browser can't get quickly. */
const GEOLOCATION_TIMEOUT_MS = 10_000;

type Status =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "located"; origin: Coordinates }
  | { kind: "denied" }
  | { kind: "unavailable" };

/**
 * "Which sensors are near me?" — the most concrete question a resident has, and
 * one the app can answer without a backend: the position is read once, used to
 * sort the sensors already loaded, and never stored or sent anywhere.
 */
export function NearMeSensors({ sensors }: { sensors: Sensor[] }) {
  const { t } = useTranslation("overview");
  const { t: tc } = useTranslation("common");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function locate() {
    if (!("geolocation" in navigator)) {
      setStatus({ kind: "unavailable" });
      return;
    }
    setStatus({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus({
          kind: "located",
          origin: {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          },
        });
      },
      (error) => {
        setStatus({
          kind: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        });
      },
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 5 * 60 * 1000 },
    );
  }

  const origin = status.kind === "located" ? status.origin : null;
  const nearest = useMemo(
    () => (origin ? getNearestSensors(sensors, origin, NEAREST_COUNT) : []),
    [origin, sensors],
  );

  return (
    <section className="near-me" aria-labelledby="near-me-heading">
      <div className="near-me__intro">
        <h2 className="kern-heading-small" id="near-me-heading">
          {t("nearMe.heading")}
        </h2>
        <p className="kern-body kern-body--small kern-body--muted">
          {t("nearMe.privacy")}
        </p>
      </div>
      <KernButton
        type="button"
        variant="secondary"
        onClick={locate}
        disabled={status.kind === "locating"}
        icon="visibility"
        label={
          status.kind === "locating" ? t("nearMe.locating") : t("nearMe.button")
        }
      />

      <div role="status" aria-live="polite" className="near-me__result">
        {status.kind === "denied" && (
          <p className="kern-body kern-body--small">{t("nearMe.denied")}</p>
        )}
        {status.kind === "unavailable" && (
          <p className="kern-body kern-body--small">{t("nearMe.unavailable")}</p>
        )}
        {status.kind === "located" && nearest.length === 0 && (
          <p className="kern-body kern-body--small">{t("nearMe.none")}</p>
        )}
        {status.kind === "located" && nearest.length > 0 && (
          <ul className="near-me__list">
            {nearest.map(({ sensor, distanceMeters }) => (
              <li key={sensor.objectId}>
                <Link className="near-me__item" to={`/sensor/${sensor.objectId}`}>
                  <span className="legend-item">
                    <span
                      className="cat-dot"
                      style={{ background: getCategoryColor(sensor.category) }}
                      aria-hidden="true"
                    />
                    {tc(categoryLabelKey(sensor.category))}
                  </span>
                  <span className="near-me__name">{sensor.name}</span>
                  <span className="near-me__reading">
                    {formatPrimaryReading(sensor)}
                  </span>
                  <span className="kern-body kern-body--small kern-body--muted">
                    {formatDistance(distanceMeters)} · {timeAgo(sensor.measuredAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
