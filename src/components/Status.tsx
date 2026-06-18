import type { ReactNode } from "react";
import { KernAlert, KernLoader } from "@kern-ux-annex/kern-react-kit";
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

/** KERN danger alert; announced assertively via role="alert". */
export function ErrorMessage({ error }: { error: string }) {
  const { t } = useTranslation();
  return (
    <KernAlert title={t("status.errorTitle")} variant="danger" className="alert-stack">
      {error}
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
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorMessage error={state.error} />;
  if (state.data == null || (isEmpty && isEmpty(state.data)))
    return <Empty label={emptyLabel} />;
  return <>{children(state.data)}</>;
}
