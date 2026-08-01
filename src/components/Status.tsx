import type { ReactNode } from "react";
import { KernAlert, KernButton, KernLoader } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

import type { AsyncState } from "../hooks/useAsync";

/** Spinner + label, announced politely to assistive tech. */
export function Loading({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="loader-wrap" role="status">
      <KernLoader />
      <span className="kern-body kern-body--small">{label ?? t("status.loading")}</span>
    </div>
  );
}

/**
 * KERN danger alert; announced assertively via role="alert". The upstream
 * service is unreliable enough that an error is an ordinary state rather than an
 * exceptional one, so it leads with plain language, keeps the technical message
 * as a secondary detail, and — where the caller can retry — offers the way out.
 */
export function ErrorMessage({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <KernAlert title={t("status.errorTitle")} variant="danger" className="alert-stack">
      <p className="kern-body kern-body--small">{t("status.errorHint")}</p>
      <p className="status-error__detail kern-body kern-body--small mono">{error}</p>
      {onRetry && (
        <KernButton
          type="button"
          variant="secondary"
          className="kern-btn--x-small status-error__retry"
          onClick={onRetry}
          icon="autorenew"
          label={t("status.retry")}
        />
      )}
    </KernAlert>
  );
}

/** KERN info alert for empty results. */
export function Empty({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <KernAlert
      title={label ?? t("status.empty")}
      variant="info"
      className="alert-stack"
    />
  );
}

/**
 * Render the common loading/error/empty branches of an async load; calls
 * `children` only when data is present and (optionally) non-empty.
 *
 * A *refresh* — loading while data is already held — keeps rendering that data
 * rather than falling back to the spinner, so pressing refresh doesn't blank the
 * page out from under the reader.
 */
export function AsyncBoundary<T>({
  state,
  isEmpty,
  emptyLabel,
  children,
}: {
  state: AsyncState<T>;
  isEmpty?: (data: T) => boolean;
  emptyLabel?: string;
  children: (data: T) => ReactNode;
}) {
  if (state.loading && state.data == null) return <Loading />;
  if (state.error) return <ErrorMessage error={state.error} onRetry={state.reload} />;
  if (state.data == null || (isEmpty && isEmpty(state.data)))
    return <Empty label={emptyLabel} />;
  return <>{children(state.data)}</>;
}
