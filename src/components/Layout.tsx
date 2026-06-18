import type { ReactNode } from "react";
import { KernIcon, type KernIconType } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router-dom";

const NAV = [
  { to: "/", labelKey: "nav.overview", icon: "home", end: true },
  { to: "/map", labelKey: "nav.map", icon: "visibility", end: false },
  { to: "/temperature", labelKey: "nav.temperature", icon: null, end: false },
  { to: "/sensors", labelKey: "nav.sensors", icon: "checklist", end: false },
  { to: "/query", labelKey: "nav.query", icon: "search", end: false },
  { to: "/about", labelKey: "nav.about", icon: "info", end: false },
] satisfies Array<{
  to: string;
  labelKey: string;
  icon: KernIconType | null;
  end: boolean;
}>;

/** App chrome: KERN government strip, header with nav, main content, footer. */
export function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

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
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
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
              ))}
            </nav>
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
