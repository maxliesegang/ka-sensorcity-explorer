import { useState, type ReactNode } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";

/** Below this width the filter panel collapses into a tap-to-expand disclosure. */
const COMPACT_QUERY = "(max-width: 760px)";

/**
 * Filter panel that is always open on wide viewports and collapses into a
 * `<details>` disclosure on narrow ones. `className` is the base class; the CSS
 * for `{className}` and `{className}__summary` owns the responsive show/hide.
 */
export function CollapsibleFilters({
  className,
  summaryLabel,
  summaryMeta,
  children,
}: {
  className: string;
  summaryLabel: ReactNode;
  summaryMeta: ReactNode;
  children: ReactNode;
}) {
  const compact = useMediaQuery(COMPACT_QUERY);
  const [expanded, setExpanded] = useState(false);

  return (
    <details
      className={className}
      open={!compact || expanded}
      onToggle={(event) => {
        if (compact) setExpanded(event.currentTarget.open);
      }}
    >
      <summary className={`${className}__summary`}>
        <span>{summaryLabel}</span>
        <span className="kern-body kern-body--small kern-body--muted">{summaryMeta}</span>
      </summary>
      {children}
    </details>
  );
}
