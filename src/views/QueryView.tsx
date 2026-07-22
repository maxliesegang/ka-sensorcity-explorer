// Interactive query builder for the FeatureServer `/query` endpoint. Lets
// developers tweak the standard ArcGIS query params, see the resolved request
// URL, and inspect the returned features as a table. Execution is strictly
// user-triggered (no auto-run on mount), so we manage our own async state.

import { useEffect, useState } from "react";
import { KernAlert, KernBadge, KernButton, KernIcon } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { ARCGIS_MAX_PAGE_SIZE, query, queryUrl } from "../api/arcgis";
import type { QueryParams } from "../api/arcgis";
import { LAYERS, TEMPERATURE_CATEGORY_KEY } from "../config/layers";
import { Empty, ErrorMessage, Loading } from "../components/Status";
import type { AttributeValue, Feature, QueryResponse } from "../types";
import type { FieldInfo } from "../types";
import { rowsToCsv } from "../utils/csv";
import { downloadTextFile } from "../utils/download";
import { formatTimestamp } from "../utils/format";

const PRESETS = [
  {
    key: "latestLive",
    layerId: 1,
    where: "1=1",
    outFields: "objectid,name,beschreibung,measured_at,lat,lon",
    orderByFields: "measured_at DESC",
    resultRecordCount: 50,
  },
  {
    key: "weatherStations",
    layerId: 1,
    where: `beschreibung='${TEMPERATURE_CATEGORY_KEY}'`,
    // Particulates (pm10/pm25) are archive-only — the live layer has no such fields.
    outFields: "objectid,name,temp,luftfeuchte,press,sonnenstrahlung,measured_at",
    orderByFields: "measured_at DESC",
    resultRecordCount: 50,
  },
];

/** Union of attribute keys across features (falls back to the first feature). */
function columnsFor(features: Feature[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const f of features) {
    for (const k of Object.keys(f.attributes)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  return keys;
}

function cell(value: AttributeValue | undefined): string {
  return value == null ? "—" : String(value);
}

function isDateField(field: FieldInfo | undefined, name: string): boolean {
  return field?.type === "esriFieldTypeDate" || name === "measured_at" || name === "inserted_at";
}

function isNumericField(field: FieldInfo | undefined): boolean {
  return field?.type != null && /(?:Integer|Double|Single|OID|SmallInteger)$/.test(field.type);
}

function formatCell(
  value: AttributeValue | undefined,
  field: FieldInfo | undefined,
  name: string,
): string {
  return isDateField(field, name) && typeof value === "number"
    ? formatTimestamp(value)
    : cell(value);
}

function toCsv(features: Feature[]): string {
  const columns = columnsFor(features);
  return rowsToCsv([
    columns,
    ...features.map((feature) =>
      columns.map((column) => feature.attributes[column]),
    ),
  ]);
}

export function QueryView() {
  const { t } = useTranslation("query");
  const [layerId, setLayerId] = useState(1);
  const [where, setWhere] = useState("1=1");
  const [outFields, setOutFields] = useState("*");
  const [orderByFields, setOrderByFields] = useState("");
  const [resultRecordCount, setResultRecordCount] = useState(25);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [resultRequest, setResultRequest] = useState<{ layerId: number; url: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  // Build the request params once so the displayed URL is exactly what `run` hits.
  const params: QueryParams = {
    where: where || "1=1",
    outFields: outFields || undefined,
    orderByFields: orderByFields || undefined,
    resultRecordCount,
    returnGeometry: false,
  };
  const url = queryUrl(layerId, params);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setLayerId(preset.layerId);
    setWhere(preset.where);
    setOutFields(preset.outFields);
    setOrderByFields(preset.orderByFields);
    setResultRecordCount(preset.resultRecordCount);
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 2400);
    }
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const res = await query(layerId, params, controller.signal);
      if (controller.signal.aborted) return;
      setResult(res);
      setResultRequest({ layerId, url });
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
      setResultRequest(null);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <section className="query-page">
      <div className="view-header view-header--wide">
        <KernBadge label={t("badge")} variant="info" />
        <h1 className="kern-heading-medium">{t("heading")}</h1>
        <p className="kern-body kern-body--muted">{t("intro")}</p>
      </div>

      <div className="preset-row" aria-label={t("presetsAria")}>
        {PRESETS.map((preset) => (
          <button
            type="button"
            className="preset-button"
            key={preset.key}
            onClick={() => applyPreset(preset)}
          >
            <KernIcon icon="autorenew" size="small" />
            <span className="kern-label">{t(`presets.${preset.key}`)}</span>
          </button>
        ))}
      </div>

      <form className="query-form" onSubmit={run}>
        <div className="query-form-primary">
          <div className="field kern-form-input query-form-grid__layer">
            <label className="kern-label" htmlFor="q-layer">{t("layer")}</label>
            <div className="kern-form-input__select-wrapper">
              <select
                id="q-layer"
                className="kern-form-input__select"
                value={layerId}
                onChange={(e) => setLayerId(Number(e.target.value))}
              >
                {LAYERS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id} – {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <KernButton
            type="submit"
            variant="primary"
            className="query-form-grid__submit"
            icon="search"
            label={t("runQuery")}
          />
        </div>
        <details className="query-advanced">
          <summary className="kern-link">{t("advancedSettings")}</summary>
          <p className="kern-body kern-body--small kern-body--muted">
            {t("advancedHint")}
          </p>
          <div className="query-form-grid">
            <div className="field kern-form-input query-form-grid__wide">
            <label className="kern-label" htmlFor="q-where">where</label>
            <input
              id="q-where"
              className="kern-form-input__input"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
            />
          </div>
            <div className="field kern-form-input query-form-grid__wide">
            <label className="kern-label" htmlFor="q-fields">outFields</label>
            <input
              id="q-fields"
              className="kern-form-input__input"
              value={outFields}
              onChange={(e) => setOutFields(e.target.value)}
            />
          </div>
            <div className="field kern-form-input">
            <label className="kern-label" htmlFor="q-order">orderByFields</label>
            <input
              id="q-order"
              className="kern-form-input__input"
              value={orderByFields}
              placeholder="measured_at DESC"
              onChange={(e) => setOrderByFields(e.target.value)}
            />
          </div>
            <div className="field kern-form-input query-form-grid__count">
            <label className="kern-label" htmlFor="q-count">resultRecordCount</label>
            <input
              id="q-count"
              type="number"
              className="kern-form-input__input"
              min={1}
              max={ARCGIS_MAX_PAGE_SIZE}
              value={resultRecordCount}
              onChange={(e) => setResultRecordCount(Number(e.target.value))}
            />
          </div>
          </div>
        </details>
      </form>

      <div className="url-box request-console" aria-label={t("resolvedUrl")}>
        <div className="request-console__header">
          <span className="kern-label">{t("resolvedUrl")}</span>
          <KernButton
            type="button"
            variant="tertiary"
            className="kern-btn--x-small"
            onClick={copyUrl}
            icon="content-copy"
            label={
              copyStatus === "copied"
                ? t("copied")
                : copyStatus === "failed"
                  ? t("copyFailed")
                  : t("copy")
            }
          />
        </div>
        <code>{url}</code>
      </div>

      <QueryResult loading={loading} error={error} result={result} request={resultRequest} />
    </section>
  );
}

function QueryResult({
  loading,
  error,
  result,
  request,
}: {
  loading: boolean;
  error: string | null;
  result: QueryResponse | null;
  request: { layerId: number; url: string } | null;
}) {
  const { t } = useTranslation("query");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => setPage(1), [result]);

  if (loading) return <Loading label={t("running")} />;
  if (error) return <ErrorMessage error={error} />;
  if (result == null) return null;
  if (result.features.length === 0) return <Empty label={t("noFeatures")} />;

  const columns = columnsFor(result.features);
  const fieldsByName = new Map((result.fields ?? []).map((field) => [field.name, field]));
  const oidField = result.fields?.find(
    (field) => field.type === "esriFieldTypeOID" && columns.includes(field.name),
  );
  const pageCount = Math.ceil(result.features.length / pageSize);
  const currentPage = Math.min(page, pageCount);
  const visibleFeatures = result.features.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <>
      <div className="result-bar" role="status" aria-live="polite">
        <div>
          <span className="kern-body kern-body--small">
            {t("rows", { count: result.features.length })}
          </span>
          {request && (
            <span
              className="result-context kern-body kern-body--small kern-body--muted"
              title={request.url}
            >
              {t("resultContext", { layer: request.layerId })}
            </span>
          )}
        </div>
        <div className="result-actions">
          <KernButton
            type="button"
            variant="secondary"
            className="kern-btn--x-small"
            onClick={() =>
              downloadTextFile(
                "sensorcity-query.json",
                JSON.stringify(result.features, null, 2),
                "application/json",
              )
            }
            label={t("downloadJson")}
          />
          <KernButton
            type="button"
            variant="secondary"
            className="kern-btn--x-small"
            onClick={() =>
              downloadTextFile("sensorcity-query.csv", toCsv(result.features), "text/csv")
            }
            label={t("downloadCsv")}
          />
        </div>
      </div>
      {result.exceededTransferLimit && (
        <KernAlert
          title={t("transferLimit")}
          variant="info"
          className="alert-stack"
        />
      )}
      <div className="kern-table-responsive table-scroll table-scroll--bounded">
        <table className="kern-table kern-table--striped kern-table--small table--has-identity">
          <caption className="visually-hidden">
            {t("tableCaption", {
              count: result.features.length,
              layer: request?.layerId ?? "—",
            })}
          </caption>
          <thead>
            <tr className="kern-table__row">
              {columns.map((c) => {
                const numeric = isNumericField(fieldsByName.get(c));
                return (
                  <th
                    className={`kern-table__header${numeric ? " kern-table__header--numeric" : ""}${
                      oidField?.name === c ? " table__identity" : ""
                    }`}
                    scope="col"
                    key={c}
                  >
                    {c}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="kern-table__body">
            {visibleFeatures.map((f, i) => (
              <tr
                className="kern-table__row"
                key={oidField ? String(f.attributes[oidField.name]) : `${currentPage}-${i}`}
              >
                {columns.map((c) =>
                  oidField?.name === c ? (
                    <th
                      className={`kern-table__cell${
                        isNumericField(fieldsByName.get(c)) ? " kern-table__cell--numeric" : ""
                      } table__identity`}
                      scope="row"
                      key={c}
                    >
                      {formatCell(f.attributes[c], fieldsByName.get(c), c)}
                    </th>
                  ) : (
                    <td
                      className={`kern-table__cell${
                        isNumericField(fieldsByName.get(c)) ? " kern-table__cell--numeric" : ""
                      }`}
                      key={c}
                    >
                      {formatCell(f.attributes[c], fieldsByName.get(c), c)}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <nav className="table-pagination" aria-label={t("pagination.label")}>
          <KernButton
            type="button"
            variant="tertiary"
            icon="arrow-back"
            label={t("pagination.previous")}
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          />
          <span className="kern-body kern-body--small">
            {t("pagination.status", {
              page: currentPage,
              pages: pageCount,
              from: (currentPage - 1) * pageSize + 1,
              to: Math.min(currentPage * pageSize, result.features.length),
              total: result.features.length,
            })}
          </span>
          <KernButton
            type="button"
            variant="tertiary"
            icon="arrow-forward"
            label={t("pagination.next")}
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
          />
        </nav>
      )}
    </>
  );
}
