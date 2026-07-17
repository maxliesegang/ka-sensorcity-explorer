import { useEffect, useRef, type ReactNode } from "react";
import { KernIcon, type KernIconType } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router-dom";
import { SUPPORTED_LANGUAGES, type Language } from "../i18n";

type NavItem = {
  to: string;
  labelKey: string;
  icon: KernIconType | null;
  end: boolean;
};

const PRIMARY_NAV = [
  { to: "/", labelKey: "nav.overview", icon: "home", end: true },
  { to: "/map", labelKey: "nav.map", icon: "visibility", end: false },
  { to: "/sensors", labelKey: "nav.sensors", icon: "checklist", end: false },
  { to: "/temperature", labelKey: "nav.temperature", icon: null, end: false },
] satisfies NavItem[];

const SECONDARY_NAV = [
  { to: "/query", labelKey: "nav.query", icon: "search", end: false },
  { to: "/about", labelKey: "nav.about", icon: "info", end: false },
] satisfies NavItem[];

/** App chrome: KERN government strip, header with nav, main content, footer. */
export function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const moreRef = useRef<HTMLDetailsElement>(null);
  const currentLang = (i18n.resolvedLanguage ?? i18n.language) as string;
  const isSecondaryActive = SECONDARY_NAV.some((item) => pathname.startsWith(item.to));

  useEffect(() => {
    function closeMore(event: PointerEvent | KeyboardEvent) {
      const details = moreRef.current;
      if (!details?.open) return;
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        details.removeAttribute("open");
        details.querySelector("summary")?.focus();
        return;
      }
      if (event instanceof PointerEvent && !details.contains(event.target as Node)) {
        details.removeAttribute("open");
      }
    }

    document.addEventListener("pointerdown", closeMore);
    document.addEventListener("keydown", closeMore);
    return () => {
      document.removeEventListener("pointerdown", closeMore);
      document.removeEventListener("keydown", closeMore);
    };
  }, []);

  function renderNavItem(item: NavItem) {
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        aria-label={t(item.labelKey)}
        title={t(item.labelKey)}
        onClick={() => moreRef.current?.removeAttribute("open")}
        className={({ isActive }) =>
          `app__nav-link${isActive ? " app__nav-link--active" : ""}`
        }
      >
        {item.icon ? (
          <KernIcon icon={item.icon} size="small" />
        ) : (
          <i
            className="kern-icon kern-icon--device-thermostat kern-icon--small"
            aria-hidden="true"
          />
        )}
        <span>{t(item.labelKey)}</span>
      </NavLink>
    );
  }

  return (
    <div className="app">
      <a className="skip-link kern-link" href="#main">
        {t("skipToMain")}
      </a>

      <div className="app__header-wrap">
        <header className="app__header">
          <Link className="app__brand" to="/" aria-label={t("app.homeAria")}>
            <span className="app__brand-mark" aria-hidden="true">
              KA
            </span>
            <span>
              <span className="app__title">{t("app.brand")}</span>
            </span>
          </Link>
          <div className="app__tools">
            <nav className="app__nav" aria-label={t("nav.primary")}>
              {PRIMARY_NAV.map(renderNavItem)}
              <details className="app__more" ref={moreRef}>
                <summary
                  className={`app__nav-link app__more-summary${
                    isSecondaryActive ? " app__nav-link--active" : ""
                  }`}
                  aria-label={t("nav.moreAria")}
                >
                  <KernIcon icon="more-vert" size="small" />
                  <span>{t("nav.more")}</span>
                </summary>
                <div className="app__more-panel">
                  <div role="group" aria-label={t("nav.secondary")}>
                    {SECONDARY_NAV.map(renderNavItem)}
                  </div>
                </div>
              </details>
            </nav>
            <div
              className="theme-switch app__language"
              role="group"
              aria-label={t("language.label")}
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
                    title={t(`language.${lang}`)}
                  >
                    <span className="theme-switch__text theme-switch__text--code">
                      {lang.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>
      </div>

      <main id="main" className="app__main" tabIndex={-1}>
        {children}
      </main>

      <footer className="app__footer">
        <span className="kern-body kern-body--small">
          {t("footer.builtWith")}{" "}
          <a
            className="kern-link"
            href="https://geoportal.karlsruhe.de/sensorcity/Dashboard/"
            target="_blank"
            rel="noreferrer"
          >
            {t("footer.source")}
            <span className="visually-hidden">{t("footer.opensNewWindow")}</span>
          </a>
          {t("footer.suffix")}
        </span>
      </footer>
    </div>
  );
}
