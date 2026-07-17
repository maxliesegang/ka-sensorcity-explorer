// Interactive query builder for the FeatureServer `/query` endpoint. Lets
// developers tweak the standard ArcGIS query params, see the resolved request
// URL, and inspect the returned features as a table. Execution is strictly
// user-triggered (no auto-run on mount), so we manage our own async state.

import { useState } from "react";
import { KernAlert, KernBadge, KernButton, KernIcon } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { MAX_RECORD_COUNT, query, queryUrl } from "../api/arcgis";
import type { QueryParams } from "../api/arcgis";
import { LAYERS, TEMPERATURE_CATEGORY_KEY } from "../config/layers";
import { Empty, ErrorMessage, Loading } from "../components/Status";
import type { AttributeValue, Feature, QueryResponse } from "../types";

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

function download(filename: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: AttributeValue | undefined): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(features: Feature[]): string {
  const columns = columnsFor(features);
  const lines = [
    columns.map(csvEscape).join(","),
    ...features.map((feature) =>
      columns.map((column) => csvEscape(feature.attributes[column])).join(","),
    ),
  ];
  return lines.join("\n");
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
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <section className="query-page">
      <div className="view-header view-header--wide">
        <KernBadge label={t("badge")} variant="info" />
        <h1 className="kern-heading-large">{t("heading")}</h1>
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
        <div className="query-form-grid">
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
              max={MAX_RECORD_COUNT}
              value={resultRecordCount}
              onChange={(e) => setResultRecordCount(Number(e.target.value))}
            />
          </div>
          <KernButton
            type="submit"
            variant="primary"
            className="query-form-grid__submit"
            icon="search"
            label={t("runQuery")}
          />
        </div>
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

      <QueryResult loading={loading} error={error} result={result} />
    </section>
  );
}

function QueryResult({
  loading,
  error,
  result,
}: {
  loading: boolean;
  error: string | null;
  result: QueryResponse | null;
}) {
  const { t } = useTranslation("query");
  if (loading) return <Loading label={t("running")} />;
  if (error) return <ErrorMessage error={error} />;
  if (result == null) return null;
  if (result.features.length === 0) return <Empty label={t("noFeatures")} />;

  const columns = columnsFor(result.features);

  return (
    <>
      <div className="result-bar" role="status" aria-live="polite">
        <span className="kern-body kern-body--small">
          {t("rows", { count: result.features.length })}
        </span>
        <div className="result-actions">
          <KernButton
            type="button"
            variant="secondary"
            className="kern-btn--x-small"
            onClick={() =>
              download(
                "sensorcity-query.json",
                "application/json",
                JSON.stringify(result.features, null, 2),
              )
            }
            label="JSON"
          />
          <KernButton
            type="button"
            variant="secondary"
            className="kern-btn--x-small"
            onClick={() => download("sensorcity-query.csv", "text/csv", toCsv(result.features))}
            label="CSV"
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
      <div className="kern-table-responsive table-scroll">
        <table className="kern-table kern-table--striped kern-table--small">
          <thead>
            <tr className="kern-table__row">
              {columns.map((c) => (
                <th className="kern-table__header" scope="col" key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="kern-table__body">
            {result.features.map((f, i) => (
              <tr className="kern-table__row" key={i}>
                {columns.map((c) => (
                  <td className="kern-table__cell" key={c}>{cell(f.attributes[c])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
