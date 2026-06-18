import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface DetailTabItem<Id extends string> {
  id: Id;
  label: string;
  panel: ReactNode;
}

interface DetailTabsProps<Id extends string> {
  ariaLabel: string;
  items: DetailTabItem<Id>[];
  activeId: Id;
  onActiveIdChange: (id: Id) => void;
}

/**
 * Small accessible tab shell for dense detail pages. It owns keyboard movement
 * and ARIA wiring while callers own the selected tab state and panel content.
 */
export function DetailTabs<Id extends string>({
  ariaLabel,
  items,
  activeId,
  onActiveIdChange,
}: DetailTabsProps<Id>) {
  const idPrefix = useId().replace(/:/g, "");
  const buttonRefs = useRef<Partial<Record<Id, HTMLButtonElement>>>({});

  function select(id: Id, focus = false) {
    onActiveIdChange(id);
    if (focus) {
      window.requestAnimationFrame(() => buttonRefs.current[id]?.focus());
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();
    const index = items.findIndex((item) => item.id === activeId);
    const last = items.length - 1;
    const next =
      event.key === "Home"
        ? items[0]
        : event.key === "End"
          ? items[last]
          : items[
              (index +
                (event.key === "ArrowRight" ? 1 : -1) +
                items.length) %
                items.length
            ];

    if (next) select(next.id, true);
  }

  const active = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <section className="detail-tabs" aria-label={ariaLabel}>
      <div
        className="detail-tabs__list"
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
      >
        {items.map((item) => {
          const isActive = active.id === item.id;
          const tabId = `${idPrefix}-tab-${item.id}`;
          const panelId = `${idPrefix}-panel-${item.id}`;

          return (
            <button
              type="button"
              className={`detail-tabs__tab${
                isActive ? " detail-tabs__tab--active" : ""
              }`}
              id={tabId}
              key={item.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              ref={(node) => {
                if (node) buttonRefs.current[item.id] = node;
                else delete buttonRefs.current[item.id];
              }}
              onClick={() => select(item.id)}
            >
              <span className="kern-label">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div
        className="detail-tabs__panel"
        id={`${idPrefix}-panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-tab-${active.id}`}
      >
        {active.panel}
      </div>
    </section>
  );
}
