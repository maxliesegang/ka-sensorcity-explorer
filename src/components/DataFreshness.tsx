import { KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

import type { AsyncState } from "../hooks/useAsync";
import { useTicker } from "../hooks/useTicker";
import { formatTime, timeAgo } from "../utils/format";

/**
 * "Data from 14:05 · 3 min ago" plus a refresh button, for the views that draw
 * live readings.
 *
 * Live data is fetched once per mount, so without this a tab left open keeps
 * presenting hours-old readings as current. The relative age ticks (via
 * useTicker) rather than freezing at whatever it said when the page last
 * rendered, and refreshing keeps the current data on screen while it reloads.
 *
 * Takes the whole `useAsync` state rather than its three freshness fields
 * unpacked, so views (and the inner components they drill through) pass one
 * prop. `onRefresh` overrides `state.reload` for the pages whose refresh has to
 * reload more than one loader.
 */
export function DataFreshness({
  state,
  onRefresh,
  className,
}: {
  state: Pick<AsyncState<unknown>, "loadedAt" | "loading" | "reload">;
  onRefresh?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  // Subscribes this component to the clock so `timeAgo` stays honest.
  useTicker();
  const { loadedAt, loading } = state;

  return (
    <div className={`data-freshness${className ? ` ${className}` : ""}`}>
      <span className="kern-body kern-body--small kern-body--muted">
        {loadedAt == null
          ? t("freshness.pending")
          : t("freshness.loadedAt", {
              time: formatTime(loadedAt),
              ago: timeAgo(loadedAt),
            })}
      </span>
      <KernButton
        type="button"
        variant="tertiary"
        className="kern-btn--x-small"
        onClick={onRefresh ?? state.reload}
        disabled={loading}
        icon="autorenew"
        label={loading ? t("freshness.refreshing") : t("freshness.refresh")}
      />
    </div>
  );
}
