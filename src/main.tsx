import React from "react";
import ReactDOM from "react-dom/client";
import { setWorkerUrl } from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker.js?url";

// KERN UX React kit styles (design system CSS + Fira Sans font).
import "@kern-ux-annex/kern-react-kit/kern-react-kit.css";
// MapLibre GL base styles (map controls, popups, canvas layout).
import "maplibre-gl/dist/maplibre-gl.css";
// App-specific layout/styles on top of KERN tokens.
import "./styles.css";

// Initialize i18next (English/German) before the app renders.
import "./i18n";

import { App } from "./App";

// MapLibre's default build creates its worker by stringifying bundled module
// factories. A second minification pass by Vite can rename identifiers across
// that runtime boundary, leaving references such as `K` undefined in the Blob
// worker. Use MapLibre's standalone worker build instead.
setWorkerUrl(mapLibreWorkerUrl);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
