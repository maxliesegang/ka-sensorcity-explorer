import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { Layout } from "./components/Layout";
import { OverviewView } from "./views/OverviewView";
import { SensorsView } from "./views/SensorsView";
import { MapView } from "./views/MapView";
import { TemperatureFieldView } from "./views/TemperatureFieldView";
import { CombinedTemperatureFieldView } from "./views/CombinedTemperatureFieldView";
import { SensorDetailView } from "./views/SensorDetailView";
import { QueryView } from "./views/QueryView";
import { AboutView } from "./views/AboutView";

export type ThemeMode = "system" | "light" | "dark";
const THEME_STORAGE_KEY = "ka-sensorcity-theme";

// Per-path document titles, resolved to `common` translation keys.
const TITLE_KEYS: Record<string, string> = {
  "/": "nav.overview",
  "/sensors": "nav.sensors",
  "/map": "nav.map",
  "/temperature": "nav.temperature",
  "/query": "nav.query",
  "/about": "nav.about",
};

/**
 * On client-side navigation, update the document title and keep the viewport at
 * the top of the page. Avoid moving focus to `<main>` here: browsers may scroll
 * focused landmarks into view, which made the map route feel like it jumped
 * down on navigation.
 */
function RouteEffects() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const baseTitle = t("app.title");

  useEffect(() => {
    const sectionKey = pathname.startsWith("/sensor/")
      ? "titles.sensorDetail"
      : TITLE_KEYS[pathname];
    const section = sectionKey ? t(sectionKey) : "";
    document.title = section ? `${section} · ${baseTitle}` : baseTitle;

    window.scrollTo({ top: 0, left: 0 });
    // Re-run on language change so the title stays localized.
  }, [pathname, t, baseTitle, i18n.language]);

  return null;
}

function storedThemeMode(): ThemeMode {
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

// HashRouter is used so deep links work on GitHub Pages without server config.
export function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(storedThemeMode);

  useEffect(() => {
    const root = document.documentElement;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);

    if (themeMode === "system") {
      delete root.dataset.kernTheme;
      root.style.removeProperty("color-scheme");
      return;
    }

    root.dataset.kernTheme = themeMode;
    root.style.colorScheme = themeMode;
  }, [themeMode]);

  return (
    <HashRouter>
      <RouteEffects />
      <Layout>
        <Routes>
          <Route path="/" element={<OverviewView />} />
          <Route path="/sensors" element={<SensorsView />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/temperature" element={<TemperatureFieldView />} />
          {/* Hidden from nav: combined SensorCity + community temperature field. */}
          <Route
            path="/combined-temperature"
            element={<CombinedTemperatureFieldView />}
          />
          <Route path="/heatmap" element={<Navigate to="/temperature" replace />} />
          <Route path="/sensor/:objectId" element={<SensorDetailView />} />
          <Route path="/query" element={<QueryView />} />
          <Route
            path="/about"
            element={
              <AboutView
                themeMode={themeMode}
                onThemeModeChange={setThemeMode}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
