import React from "react";
import ReactDOM from "react-dom/client";
import { setWorkerUrl } from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

// KERN UX React kit styles (design system CSS + Fira Sans font).
import "@kern-ux-annex/kern-react-kit/kern-react-kit.css";
// MapLibre GL base styles (map controls, popups, canvas layout).
import "maplibre-gl/dist/maplibre-gl.css";
// App-specific layout/styles on top of KERN tokens.
import "./styles.css";

// Initialize i18next (English/German) before the app renders.
import "./i18n";

import { App } from "./App";

// Vite needs the worker URL explicitly because import.meta.url does not resolve
// reliably to a bundled worker file.
setWorkerUrl(mapLibreWorkerUrl);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
