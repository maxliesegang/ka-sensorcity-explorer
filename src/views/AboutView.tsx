import { useTranslation } from "react-i18next";
import { KernBadge, KernIcon } from "@kern-ux-annex/kern-react-kit";
import { Link } from "react-router-dom";

import type { ThemeMode } from "../App";
import { LAYERS, layerLabelKey } from "../config/layers";
import { SUPPORTED_LANGUAGES, type Language } from "../i18n";

const THEMES: Array<{ mode: ThemeMode; labelKey: string; icon: string }> = [
  { mode: "system", labelKey: "theme.system", icon: "kern-icon--brightness-medium" },
  { mode: "light", labelKey: "theme.light", icon: "kern-icon--light-mode" },
  { mode: "dark", labelKey: "theme.dark", icon: "kern-icon--dark-mode" },
];

export function AboutView({
  themeMode,
  onThemeModeChange,
}: {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}) {
  const { t, i18n } = useTranslation("about");
  const { t: tc } = useTranslation("common");
  const currentLang = (i18n.resolvedLanguage ?? i18n.language) as string;
  const liveLayers = LAYERS.filter((layer) => layer.live).length;
  const archiveLayers = LAYERS.length - liveLayers;

  return (
    <section className="stack">
      <div className="view-header">
        <h1 className="kern-heading-medium">{t("heading")}</h1>
        <p className="kern-body kern-body--muted">{t("intro")}</p>
      </div>

      <div className="about-grid">
        <section className="surface-section">
          <h2 className="kern-heading-small">{t("whatItDoes.heading")}</h2>
          <p className="kern-body">{t("whatItDoes.body")}</p>
          <div className="about-actions">
            <Link className="kern-btn kern-btn--primary" to="/map">
              <KernIcon icon="visibility" size="small" />
              <span className="kern-label">{t("whatItDoes.openMap")}</span>
            </Link>
            <Link className="kern-btn kern-btn--secondary" to="/query">
              <KernIcon icon="search" size="small" />
              <span className="kern-label">{t("whatItDoes.openQuery")}</span>
            </Link>
          </div>
        </section>

        <section className="surface-section">
          <h2 className="kern-heading-small">{t("design.heading")}</h2>
          <p className="kern-body">{t("design.body")}</p>
          <dl className="kern-description-list about-facts">
            <div className="kern-description-list-item">
              <dt className="kern-description-list-item__key">
                {t("design.themeModes")}
              </dt>
              <dd className="kern-description-list-item__value">
                {t("design.themeModesValue")}
              </dd>
            </div>
            <div className="kern-description-list-item">
              <dt className="kern-description-list-item__key">
                {t("design.preference")}
              </dt>
              <dd className="kern-description-list-item__value">
                {t("design.preferenceValue")}
              </dd>
            </div>
          </dl>

          <div className="about-settings">
            <div className="about-settings__row">
              <span className="kern-label about-settings__label">
                {tc("language.label")}
              </span>
              <div
                className="theme-switch"
                role="group"
                aria-label={tc("language.label")}
              >
                {SUPPORTED_LANGUAGES.map((lang: Language) => {
                  const active = currentLang === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      className={`theme-switch__option${
                        active ? " theme-switch__option--active" : ""
                      }`}
                      aria-pressed={active}
                      lang={lang}
                      onClick={() => void i18n.changeLanguage(lang)}
                      title={tc(`language.${lang}`)}
                    >
                      <span className="theme-switch__text theme-switch__text--code">
                        {lang.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="about-settings__row">
              <span className="kern-label about-settings__label">
                {tc("theme.label")}
              </span>
              <div
                className="theme-switch"
                role="group"
                aria-label={tc("theme.label")}
              >
                {THEMES.map((item) => {
                  const active = themeMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      className={`theme-switch__option${
                        active ? " theme-switch__option--active" : ""
                      }`}
                      aria-pressed={active}
                      onClick={() => onThemeModeChange(item.mode)}
                      title={tc("theme.optionTitle", { name: tc(item.labelKey) })}
                    >
                      <i
                        className={`kern-icon ${item.icon} kern-icon--small`}
                        aria-hidden="true"
                      />
                      <span className="theme-switch__text">{tc(item.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="surface-section">
        <h2 className="kern-heading-small">{t("dataSource.heading")}</h2>
        <p className="kern-body">{t("dataSource.body")}</p>
        <div className="about-summary">
          <KernBadge
            label={t("dataSource.liveLayer", { count: liveLayers })}
            variant="info"
          />
          <KernBadge
            label={t("dataSource.archiveLayer", { count: archiveLayers })}
            variant="info"
          />
          <KernBadge label={t("dataSource.readOnly")} variant="success" />
        </div>
        <div className="kern-table-responsive table-scroll">
          <table className="kern-table kern-table--striped kern-table--small">
            <caption className="visually-hidden">{t("dataSource.tableCaption")}</caption>
            <thead>
              <tr className="kern-table__row">
                <th className="kern-table__header kern-table__header--numeric" scope="col">
                  {t("dataSource.colId")}
                </th>
                <th className="kern-table__header" scope="col">
                  {t("dataSource.colLayer")}
                </th>
                <th className="kern-table__header" scope="col">
                  {t("dataSource.colPurpose")}
                </th>
                <th className="kern-table__header" scope="col">
                  {t("dataSource.colType")}
                </th>
              </tr>
            </thead>
            <tbody className="kern-table__body">
              {LAYERS.map((layer) => (
                <tr className="kern-table__row" key={layer.id}>
                  <td className="kern-table__cell kern-table__cell--numeric">{layer.id}</td>
                  <td className="kern-table__cell">
                    <code className="mono">{layer.name}</code>
                  </td>
                  <td className="kern-table__cell">{tc(layerLabelKey(layer.id))}</td>
                  <td className="kern-table__cell">
                    <KernBadge
                      label={
                        layer.live
                          ? t("dataSource.typeLive")
                          : t("dataSource.typeArchive")
                      }
                      variant={layer.live ? "success" : "info"}
                      className="kern-badge--small"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-section surface-section--plain">
        <h2 className="kern-heading-small">{t("privacy.heading")}</h2>
        <p className="kern-body">{t("privacy.body")}</p>
      </section>

      <section className="surface-section surface-section--plain">
        <h2 className="kern-heading-small">{t("experiment.heading")}</h2>
        <p className="kern-body">{t("experiment.body")}</p>
        <p className="kern-body">
          <Link className="kern-link" to="/combined-temperature">
            {t("experiment.link")}
          </Link>
        </p>
      </section>
    </section>
  );
}
