// Searchable, sortable, filterable table of all live sensors. This is the
// keyboard/screen-reader-friendly counterpart to the map: every sensor is
// reachable by name without spatial interaction.

import { useMemo, useState, type CSSProperties } from "react";
import { KernBadge, KernButton, KernIcon } from "@kern-ux-annex/kern-react-kit";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { fetchSensors } from "../api/sensorcity";
import { AsyncBoundary, Empty } from "../components/Status";
import {
  CATEGORIES,
  getCategoryColor,
  categoryLabelKey,
  measurementLabelKey,
} from "../config/layers";
import { useAsync } from "../hooks/useAsync";
import type { Sensor } from "../types";
import { timeAgo } from "../utils/format";
import {
  formatPrimaryReading,
  getPrimaryMeasurement,
  getPrimaryReading,
} from "../utils/sensorMeasurements";

type SortKey = "name" | "category" | "value" | "measuredAt";
type SortDir = "asc" | "desc";
type ViewMode = "cards" | "table";

function numericCompare(a: number | null, b: number | null, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === "asc" ? a - b : b - a;
}

function defaultSortDir(key: SortKey): SortDir {
  return key === "value" || key === "measuredAt" ? "desc" : "asc";
}

function compareSensors(
  firstSensor: Sensor,
  secondSensor: Sensor,
  key: SortKey,
  dir: SortDir,
  categoryLabel: (key: string) => string,
): number {
  let result: number;
  if (key === "measuredAt") {
    result = numericCompare(
      firstSensor.measuredAt ?? null,
      secondSensor.measuredAt ?? null,
      dir,
    );
  } else if (key === "value") {
    result = numericCompare(
      getPrimaryReading(firstSensor),
      getPrimaryReading(secondSensor),
      dir,
    );
  } else if (key === "category") {
    result = categoryLabel(firstSensor.category).localeCompare(
      categoryLabel(secondSensor.category),
    );
    if (dir === "desc") result *= -1;
  } else {
    result = firstSensor.name.localeCompare(secondSensor.name);
    if (dir === "desc") result *= -1;
  }
  if (result !== 0) return result;
  if (key === "category") {
    return firstSensor.name.localeCompare(secondSensor.name);
  }
  if (key === "name") {
    return categoryLabel(firstSensor.category).localeCompare(
      categoryLabel(secondSensor.category),
    );
  }
  return firstSensor.name.localeCompare(secondSensor.name);
}

export function SensorsView() {
  const sensors = useAsync(fetchSensors, []);
  const [params, setParams] = useSearchParams();
  const { t } = useTranslation("sensors");

  const category = params.get("category") ?? "";
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  function setCategory(next: string) {
    const nextParams = new URLSearchParams(params);
    if (next) nextParams.set("category", next);
    else nextParams.delete("category");
    setParams(nextParams, { replace: true });
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
    } else {
      setSortKey(key);
      setSortDir(defaultSortDir(key));
    }
  }

  function changeSortKey(key: SortKey) {
    setSortKey(key);
    setSortDir(defaultSortDir(key));
  }

  return (
    <div>
      <div className="view-header view-header--wide">
        <KernBadge label={t("badge")} variant="info" />
        <h1 className="kern-heading-large">{t("heading")}</h1>
        <p className="kern-body kern-body--muted">{t("intro")}</p>
      </div>

      <AsyncBoundary
        state={sensors}
        isEmpty={(data) => data.length === 0}
        emptyLabel={t("empty")}
      >
        {(data) => (
          <SensorExplorer
            sensors={data}
            category={category}
            onCategoryChange={setCategory}
            search={search}
            onSearchChange={setSearch}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onSortKeyChange={changeSortKey}
            onSortDirectionChange={setSortDir}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}
      </AsyncBoundary>
    </div>
  );
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  isNumeric,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  isNumeric?: boolean;
}) {
  const active = sortKey === column;
  const icon = active
    ? sortDir === "asc"
      ? "arrow-up"
      : "arrow-down"
    : "autorenew";
  return (
    <th
      className={`kern-table__header${isNumeric ? " kern-table__header--numeric" : ""}`}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      scope="col"
    >
      <button type="button" className="th-sort" onClick={() => onSort(column)}>
        {label}
        <KernIcon
          icon={icon}
          size="small"
          className={`th-sort__icon${active ? " th-sort__icon--active" : ""}`}
        />
      </button>
    </th>
  );
}

function SensorExplorer({
  sensors,
  category,
  onCategoryChange,
  search,
  onSearchChange,
  sortKey,
  sortDir,
  onSort,
  onSortKeyChange,
  onSortDirectionChange,
  viewMode,
  onViewModeChange,
}: {
  sensors: Sensor[];
  category: string;
  onCategoryChange: (category: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onSortKeyChange: (key: SortKey) => void;
  onSortDirectionChange: (direction: SortDir) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const { t } = useTranslation("sensors");
  const { t: tc } = useTranslation("common");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = sensors.filter((sensor) => {
      if (category && sensor.category !== category) return false;
      if (q && !sensor.name.toLowerCase().includes(q)) return false;
      return true;
    });
    const sorted = [...filtered].sort((firstSensor, secondSensor) =>
      compareSensors(
        firstSensor,
        secondSensor,
        sortKey,
        sortDir,
        (key) => tc(categoryLabelKey(key)),
      ),
    );
    return sorted;
  }, [sensors, category, search, sortKey, sortDir, tc]);

  const categoryCounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const counts = new Map<string, number>();
    let total = 0;

    for (const sensor of sensors) {
      if (q && !sensor.name.toLowerCase().includes(q)) continue;
      total += 1;
      counts.set(sensor.category, (counts.get(sensor.category) ?? 0) + 1);
    }

    return { counts, total };
  }, [sensors, search]);

  const selectedLabel = category ? tc(categoryLabelKey(category)) : t("allCategories");
  const mapped = rows.filter((sensor) => sensor.lat != null && sensor.lon != null).length;
  const newest = rows[0]?.measuredAt
    ? [...rows].sort((a, b) => (b.measuredAt ?? 0) - (a.measuredAt ?? 0))[0]
    : null;

  return (
    <>
      <section className="sensor-console" aria-label={t("filtersAria")}>
        <div className="sensor-console__summary">
          <div className="pulse-stat">
            <span className="pulse-stat__value">{rows.length}</span>
            <span className="pulse-stat__label">{t("stats.matching")}</span>
          </div>
          <div className="pulse-stat">
            <span className="pulse-stat__value">{mapped}</span>
            <span className="pulse-stat__label">{t("stats.mapped")}</span>
          </div>
          <div className="pulse-stat">
            <span className="pulse-stat__value pulse-stat__value--text">
              {newest ? timeAgo(newest.measuredAt) : "—"}
            </span>
            <span className="pulse-stat__label">{t("stats.freshest")}</span>
          </div>
        </div>

        <div className="filter-panel sensor-filter-panel">
          <fieldset className="category-picker" aria-label={t("quickFiltersAria")}>
            <legend className="kern-label category-picker__legend">
              {t("category.label")}
            </legend>
            <div className="category-picker__grid">
              <button
                type="button"
                className={`category-option category-option--all${
                  !category ? " category-option--active" : ""
                }`}
                aria-pressed={!category}
                aria-label={`${t("category.all")}, ${t("result", {
                  count: categoryCounts.total,
                })}`}
                  onClick={() => onCategoryChange("")}
              >
                <span className="category-option__mark" aria-hidden="true">
                  <KernIcon icon="checklist" size="small" />
                </span>
                <span className="category-option__label">{t("category.all")}</span>
                <span className="category-option__count">
                  {categoryCounts.total}
                </span>
              </button>
              {CATEGORIES.map((categoryOption) => {
                const count = categoryCounts.counts.get(categoryOption.key) ?? 0;
                const active = category === categoryOption.key;
                const label = tc(categoryLabelKey(categoryOption.key));

                return (
                  <button
                    type="button"
                    className={`category-option${active ? " category-option--active" : ""}`}
                    style={{ "--category-color": categoryOption.color } as CSSProperties}
                    aria-pressed={active}
                    aria-label={`${label}, ${t("result", { count })}`}
                    key={categoryOption.key}
                    onClick={() => onCategoryChange(categoryOption.key)}
                  >
                    <span className="category-option__mark" aria-hidden="true">
                      <span className="cat-dot" />
                    </span>
                    <span className="category-option__label">{label}</span>
                    <span className="category-option__count">{count}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="toolbar filter-panel--inline">
            <div className="field kern-form-input">
              <label className="kern-label" htmlFor="sensor-search">
                {t("search.label")}
              </label>
              <input
                id="sensor-search"
                className="kern-form-input__input"
                type="search"
                value={search}
                placeholder={t("search.placeholder")}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
            <div className="field kern-form-input">
              <label className="kern-label" htmlFor="sensor-sort">
                {t("sort.label")}
              </label>
              <div className="kern-form-input__select-wrapper">
                <select
                  id="sensor-sort"
                  className="kern-form-input__select"
                  value={sortKey}
                  onChange={(event) => onSortKeyChange(event.target.value as SortKey)}
                >
                  <option value="name">{t("sort.name")}</option>
                  <option value="category">{t("sort.category")}</option>
                  <option value="value">{t("sort.value")}</option>
                  <option value="measuredAt">{t("sort.measuredAt")}</option>
                </select>
              </div>
            </div>
            <KernButton
              type="button"
              variant="tertiary"
              onClick={() =>
                onSortDirectionChange(sortDir === "asc" ? "desc" : "asc")
              }
              icon={sortDir === "asc" ? "arrow-up" : "arrow-down"}
              label={sortDir === "asc" ? t("sort.ascending") : t("sort.descending")}
            />
            <KernButton
              type="button"
              variant="tertiary"
              onClick={() => {
                onSearchChange("");
                onCategoryChange("");
              }}
              icon="close"
              label={t("reset")}
            />
          </div>
        </div>
      </section>

      <div className="result-bar" role="status" aria-live="polite">
        <span className="kern-body kern-body--small">
          {t("result", { count: rows.length })}
          {category ? t("inCategory", { category: selectedLabel }) : ""}
        </span>
        <div className="segmented-control" role="group" aria-label={t("view.label")}>
          <button
            type="button"
            className={viewMode === "cards" ? "segmented-control__option segmented-control__option--active" : "segmented-control__option"}
            aria-pressed={viewMode === "cards"}
            onClick={() => onViewModeChange("cards")}
          >
            <KernIcon icon="visibility" size="small" />
            <span className="kern-label">{t("view.cards")}</span>
          </button>
          <button
            type="button"
            className={viewMode === "table" ? "segmented-control__option segmented-control__option--active" : "segmented-control__option"}
            aria-pressed={viewMode === "table"}
            onClick={() => onViewModeChange("table")}
          >
            <KernIcon icon="checklist" size="small" />
            <span className="kern-label">{t("view.table")}</span>
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty label={t("noMatch")} />
      ) : viewMode === "cards" ? (
        <div className="sensor-card-grid">
          {rows.map((sensor) => (
            <SensorCard sensor={sensor} key={sensor.objectId} />
          ))}
        </div>
      ) : (
        <div className="kern-table-responsive table-scroll">
          <table className="kern-table kern-table--striped">
            <thead>
              <tr className="kern-table__row">
                <SortHeader
                  label={t("columns.name")}
                  column="name"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label={t("columns.category")}
                  column="category"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label={t("columns.value")}
                  column="value"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  isNumeric
                />
                <SortHeader
                  label={t("columns.lastReading")}
                  column="measuredAt"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  isNumeric
                />
              </tr>
            </thead>
            <tbody className="kern-table__body">
              {rows.map((sensor) => (
                <tr className="kern-table__row" key={sensor.objectId}>
                  <td className="kern-table__cell">
                    <Link className="kern-link" to={`/sensor/${sensor.objectId}`}>
                      {sensor.name}
                    </Link>
                  </td>
                  <td className="kern-table__cell">
                    <span className="legend-item">
                      <span
                        className="cat-dot"
                        style={{ background: getCategoryColor(sensor.category) }}
                        aria-hidden="true"
                      />
                      {tc(categoryLabelKey(sensor.category))}
                    </span>
                  </td>
                  <td className="kern-table__cell kern-table__cell--numeric">
                    {formatPrimaryReading(sensor)}
                  </td>
                  <td className="kern-table__cell kern-table__cell--numeric">
                    {timeAgo(sensor.measuredAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function SensorCard({ sensor }: { sensor: Sensor }) {
  const { t } = useTranslation("sensors");
  const { t: tc } = useTranslation("common");
  const primary = getPrimaryMeasurement(sensor);

  return (
    <Link className="sensor-card" to={`/sensor/${sensor.objectId}`}>
      <span className="sensor-card__top">
        <span className="legend-item">
          <span
            className="cat-dot"
            style={{ background: getCategoryColor(sensor.category) }}
            aria-hidden="true"
          />
          {tc(categoryLabelKey(sensor.category))}
        </span>
        {/* Neutral status badge: KernBadge requires a color variant, so this
            stays raw to preserve the original variant-less appearance. */}
        <span className="kern-badge kern-badge--small">
          <span className="kern-label">
            {sensor.lat != null ? t("badges.mapped") : t("badges.noMap")}
          </span>
        </span>
      </span>
      <span className="sensor-card__name">{sensor.name}</span>
      <span className="sensor-card__reading">
        {formatPrimaryReading(sensor)}
      </span>
      <span className="kern-body kern-body--small">
        {primary ? tc(measurementLabelKey(primary.field)) : t("currentValue")} ·{" "}
        {timeAgo(sensor.measuredAt)}
      </span>
      <span className="card-link__cue">{t("openDetails")}</span>
    </Link>
  );
}
