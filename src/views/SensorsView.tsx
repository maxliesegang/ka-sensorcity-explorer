// Searchable, sortable, filterable table of all live sensors. This is the
// keyboard/screen-reader-friendly counterpart to the map: every sensor is
// reachable by name without spatial interaction.

import { useCallback, useEffect, useMemo, type CSSProperties } from "react";
import { KernBadge, KernButton, KernIcon } from "@kern-ux-annex/kern-react-kit";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { fetchSensors } from "../api/sensorcity";
import { AsyncBoundary, Empty } from "../components/Status";
import { CollapsibleFilters } from "../components/CollapsibleFilters";
import {
  CATEGORIES,
  categoryLabelKey,
  getCategory,
  getCategoryColor,
  measurementLabelKey,
} from "../config/layers";
import { useAsync } from "../hooks/useAsync";
import { useUrlState, type ParamUpdates } from "../hooks/useUrlState";
import { toEnum, toPositiveInt } from "../utils/urlParams";
import type { Measurement, Sensor } from "../types";
import { formatTimestamp, timeAgo } from "../utils/format";
import {
  formatReading,
  getMeasurementForField,
  getPrimaryMeasurement,
  getReadingForMeasurement,
} from "../utils/sensorMeasurements";

const SORT_KEYS = ["name", "category", "value", "measuredAt"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const SORT_DIRECTIONS = ["asc", "desc"] as const;
type SortDir = (typeof SORT_DIRECTIONS)[number];

const VIEW_MODES = ["cards", "table"] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const PAGE_SIZE_PARAMS = ["12", "24", "48"] as const;
const PAGE_SIZES = [12, 24, 48] as const;
type PageSize = (typeof PAGE_SIZES)[number];

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
  measurement: Measurement | undefined,
  categoryLabels: ReadonlyMap<string, string>,
): number {
  const firstCategoryLabel =
    categoryLabels.get(firstSensor.category) ?? firstSensor.category;
  const secondCategoryLabel =
    categoryLabels.get(secondSensor.category) ?? secondSensor.category;
  let result: number;
  if (key === "measuredAt") {
    result = numericCompare(
      firstSensor.measuredAt ?? null,
      secondSensor.measuredAt ?? null,
      dir,
    );
  } else if (key === "value") {
    result = numericCompare(
      getReadingForMeasurement(firstSensor, measurement),
      getReadingForMeasurement(secondSensor, measurement),
      dir,
    );
  } else if (key === "category") {
    result = firstCategoryLabel.localeCompare(secondCategoryLabel);
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
    return firstCategoryLabel.localeCompare(secondCategoryLabel);
  }
  return firstSensor.name.localeCompare(secondSensor.name);
}

export function SensorsView() {
  const sensors = useAsync(fetchSensors, []);
  const [params, updateParams] = useUrlState();
  const { t } = useTranslation("sensors");

  const categoryParam = params.get("category") ?? "";
  const selectedCategory = getCategory(categoryParam);
  const category = selectedCategory?.key ?? "";
  const measurements = selectedCategory?.measurements ?? [];
  // A measurement is meaningful only inside one selected category. Resolve it
  // at this boundary so stale or hand-edited URLs always fall back safely.
  const selectedMeasurement = getMeasurementForField(
    selectedCategory,
    params.get("field") ?? undefined,
  );
  const selectedField = selectedMeasurement?.field ?? "";
  const search = params.get("search") ?? "";
  const sortKey = toEnum(params.get("sort"), SORT_KEYS, "name");
  const sortDir = toEnum(params.get("direction"), SORT_DIRECTIONS, defaultSortDir(sortKey));
  const viewMode = toEnum(params.get("view"), VIEW_MODES, "cards");
  const pageSize = Number(toEnum(params.get("pageSize"), PAGE_SIZE_PARAMS, "24")) as PageSize;
  const page = toPositiveInt(params.get("page"), 1);

  // Filter/sort changes reset paging so the user isn't stranded on a page that
  // no longer exists; page 1 is dropped from the URL as the default.
  function updateFilters(updates: ParamUpdates) {
    updateParams({ ...updates, page: null });
  }

  function setCategory(next: string) {
    // A field belongs to one category. Reset it when the group changes so the
    // next category always starts at its own primary measurement.
    updateFilters({ category: next || null, field: null });
  }

  function setMeasurementField(next: string) {
    // Keep the default choice out of shared URLs, matching the other enum state.
    updateFilters({ field: next === measurements[0]?.field ? null : next });
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      updateFilters({ direction: sortDir === "asc" ? "desc" : "asc" });
    } else {
      updateFilters({ sort: key, direction: defaultSortDir(key) });
    }
  }

  function changeSortKey(key: SortKey) {
    updateFilters({ sort: key, direction: defaultSortDir(key) });
  }

  const handlePageChange = useCallback(
    (value: number) => updateParams({ page: value === 1 ? null : String(value) }),
    [updateParams],
  );

  return (
    <div>
      <div className="view-header view-header--wide">
        <KernBadge label={t("badge")} variant="info" />
        <h1 className="kern-heading-medium">{t("heading")}</h1>
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
            measurements={measurements}
            selectedField={selectedField}
            selectedMeasurement={selectedMeasurement}
            onMeasurementChange={setMeasurementField}
            search={search}
            onSearchChange={(value) => updateFilters({ search: value || null })}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onSortKeyChange={changeSortKey}
            onSortDirectionChange={(value) => updateFilters({ direction: value })}
            viewMode={viewMode}
            onViewModeChange={(value) => updateFilters({ view: value })}
            page={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={(value) => updateFilters({ pageSize: String(value) })}
            onReset={() => updateFilters({ search: null, category: null, field: null })}
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
  measurements,
  selectedField,
  selectedMeasurement,
  onMeasurementChange,
  search,
  onSearchChange,
  sortKey,
  sortDir,
  onSort,
  onSortKeyChange,
  onSortDirectionChange,
  viewMode,
  onViewModeChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onReset,
}: {
  sensors: Sensor[];
  category: string;
  onCategoryChange: (category: string) => void;
  measurements: Measurement[];
  selectedField: string;
  selectedMeasurement: Measurement | undefined;
  onMeasurementChange: (field: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onSortKeyChange: (key: SortKey) => void;
  onSortDirectionChange: (direction: SortDir) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  page: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation("sensors");
  const { t: tc } = useTranslation("common");

  const categoryLabels = useMemo(() => {
    const categoryKeys = new Set(sensors.map((sensor) => sensor.category));
    return new Map(
      [...categoryKeys].map((key) => [key, tc(categoryLabelKey(key))]),
    );
  }, [sensors, tc]);

  const { rows, categoryCounts } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const counts = new Map<string, number>();
    const filtered: Sensor[] = [];
    let total = 0;

    for (const sensor of sensors) {
      if (q && !sensor.name.toLowerCase().includes(q)) continue;

      total += 1;
      counts.set(sensor.category, (counts.get(sensor.category) ?? 0) + 1);
      if (!category || sensor.category === category) filtered.push(sensor);
    }

    filtered.sort((firstSensor, secondSensor) =>
      compareSensors(
        firstSensor,
        secondSensor,
        sortKey,
        sortDir,
        selectedMeasurement,
        categoryLabels,
      ),
    );

    return { rows: filtered, categoryCounts: { counts, total } };
  }, [sensors, category, search, sortKey, sortDir, selectedMeasurement, categoryLabels]);

  const selectedLabel = category ? tc(categoryLabelKey(category)) : t("allCategories");
  const valueLabel = selectedMeasurement
    ? tc(measurementLabelKey(selectedMeasurement.field))
    : t("columns.value");
  const { mapped, newest } = useMemo(() => {
    let mapped = 0;
    let newest: Sensor | null = null;

    for (const sensor of rows) {
      if (sensor.lat != null && sensor.lon != null) mapped += 1;
      if (
        sensor.measuredAt != null &&
        (newest?.measuredAt == null || sensor.measuredAt > newest.measuredAt)
      ) {
        newest = sensor;
      }
    }

    return { mapped, newest };
  }, [rows]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeFilterCount = Number(Boolean(category)) + Number(Boolean(search.trim()));

  useEffect(() => {
    if (page !== currentPage) onPageChange(currentPage);
  }, [currentPage, onPageChange, page]);

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
              {timeAgo(newest?.measuredAt ?? null)}
            </span>
            <span className="pulse-stat__label">{t("stats.freshest")}</span>
          </div>
        </div>

        <CollapsibleFilters
          className="sensor-filter-disclosure"
          summaryLabel={t("filtersLabel")}
          summaryMeta={t("filtersActive", { count: activeFilterCount })}
        >
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
                  <span className="category-option__count">{categoryCounts.total}</span>
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
              {category && measurements.length > 1 && (
                <div className="field kern-form-input">
                  <label className="kern-label" htmlFor="sensor-measurement">
                    {t("measurement")}
                  </label>
                  <div className="kern-form-input__select-wrapper">
                    <select
                      id="sensor-measurement"
                      className="kern-form-input__select"
                      value={selectedField}
                      onChange={(event) => onMeasurementChange(event.target.value)}
                    >
                      {measurements.map((measurement) => (
                        <option key={measurement.field} value={measurement.field}>
                          {tc(measurementLabelKey(measurement.field))}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="field kern-form-input">
                <label className="kern-label" htmlFor="sensor-sort">
                  {t("sort.label")}
                </label>
                <div className="kern-form-input__select-wrapper">
                  <select
                    id="sensor-sort"
                    className="kern-form-input__select"
                    value={sortKey}
                    onChange={(event) =>
                      onSortKeyChange(toEnum(event.target.value, SORT_KEYS, sortKey))
                    }
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
                onClick={onReset}
                icon="close"
                label={t("reset")}
              />
            </div>
          </div>
        </CollapsibleFilters>
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
          {visibleRows.map((sensor) => (
            <SensorCard
              sensor={sensor}
              measurement={selectedMeasurement}
              key={sensor.objectId}
            />
          ))}
        </div>
      ) : (
        <div className="kern-table-responsive table-scroll">
          <table className="kern-table kern-table--striped sensor-table--compact">
            <caption className="visually-hidden">
              {t("tableCaption", { count: rows.length })}
            </caption>
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
                  label={valueLabel}
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
              {visibleRows.map((sensor) => (
                <tr className="kern-table__row" key={sensor.objectId}>
                  <th className="kern-table__cell" scope="row">
                    <Link className="kern-link" to={`/sensor/${sensor.objectId}`}>
                      {sensor.name}
                    </Link>
                  </th>
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
                    {formatReading(sensor, selectedMeasurement)}
                  </td>
                  <td className="kern-table__cell kern-table__cell--numeric">
                    {sensor.measuredAt == null ? (
                      timeAgo(null)
                    ) : (
                      <time
                        dateTime={new Date(sensor.measuredAt).toISOString()}
                        title={formatTimestamp(sensor.measuredAt)}
                      >
                        {timeAgo(sensor.measuredAt)}
                      </time>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav className="sensor-pagination" aria-label={t("pagination.label")}>
          <label className="kern-label" htmlFor="sensor-page-size">
            {t("pagination.pageSize")}
          </label>
          <div className="kern-form-input__select-wrapper">
            <select
              id="sensor-page-size"
              className="kern-form-input__select"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
            >
              {PAGE_SIZES.map((size) => <option value={size} key={size}>{size}</option>)}
            </select>
          </div>
          <span className="kern-body kern-body--small">
            {t("pagination.status", {
              page: currentPage,
              pages: pageCount,
              from: (currentPage - 1) * pageSize + 1,
              to: Math.min(currentPage * pageSize, rows.length),
              total: rows.length,
            })}
          </span>
          <KernButton
            type="button"
            variant="tertiary"
            icon="arrow-back"
            label={t("pagination.previous")}
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          />
          <KernButton
            type="button"
            variant="tertiary"
            icon="arrow-forward"
            label={t("pagination.next")}
            disabled={currentPage === pageCount}
            onClick={() => onPageChange(currentPage + 1)}
          />
        </nav>
      )}
    </>
  );
}

function SensorCard({
  sensor,
  measurement,
}: {
  sensor: Sensor;
  measurement: Measurement | undefined;
}) {
  const { t } = useTranslation("sensors");
  const { t: tc } = useTranslation("common");
  const displayedMeasurement = measurement ?? getPrimaryMeasurement(sensor);

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
        {formatReading(sensor, displayedMeasurement)}
      </span>
      <span className="kern-body kern-body--small">
        {displayedMeasurement
          ? tc(measurementLabelKey(displayedMeasurement.field))
          : t("currentValue")}{" "}
        ·{" "}
        {timeAgo(sensor.measuredAt)}
      </span>
      <span className="card-link__cue">{t("openDetails")}</span>
    </Link>
  );
}
