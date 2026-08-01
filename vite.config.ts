import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

// Relative base + HashRouter keeps the build portable to any GitHub Pages
// path (https://<user>.github.io/<repo>/) without hardcoding the repo name.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    {
      name: "copy-maplibre-shared",
      writeBundle(_options, bundle) {
        const workerChunk = Object.keys(bundle).find((k) =>
          k.startsWith("assets/maplibre-gl-worker"),
        );
        if (!workerChunk) return;
        const sharedSrc = resolve(
          "node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs",
        );
        const sharedDest = resolve(
          "dist/assets/maplibre-gl-shared.mjs",
        );
        copyFileSync(sharedSrc, sharedDest);
      },
    },
  ],
});
