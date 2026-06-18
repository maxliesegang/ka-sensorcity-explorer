import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base + HashRouter keeps the build portable to any GitHub Pages
// path (https://<user>.github.io/<repo>/) without hardcoding the repo name.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
