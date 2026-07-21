import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base + HashRouter keeps the build portable to any GitHub Pages
// path (https://<user>.github.io/<repo>/) without hardcoding the repo name.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    // The CSP build expects a separate worker file and does not create a Blob
    // worker by stringifying code that Vite may minify again.
    alias: [
      {
        find: /^maplibre-gl$/,
        replacement: "maplibre-gl/dist/maplibre-gl-csp.js",
      },
    ],
  },
});
