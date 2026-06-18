// Demo mode: serve the app from a frozen snapshot (see `scripts/capture-demo.ts`)
// instead of the live APIs, so the explorer still works if the upstream services
// are down or unreachable.
//
// Enabled by a run parameter, either at build/run time or per-visit:
//   - env:  `VITE_DEMO=1 npm run dev`  (or set it for the build)
//   - URL:  append `?demo` / `?demo=1` (works on the deployed static site too)

function readUrlFlag(): boolean {
  if (typeof window === "undefined") return false;
  // The flag may sit before the hash (`?demo#/`) or inside the HashRouter hash
  // (`#/map?demo`), so check both.
  const search = window.location.search;
  const hashQuery = window.location.hash.includes("?")
    ? window.location.hash.slice(window.location.hash.indexOf("?"))
    : "";
  for (const part of [search, hashQuery]) {
    const value = new URLSearchParams(part).get("demo");
    if (value != null && value !== "0" && value !== "false") return true;
  }
  return false;
}

function readEnvFlag(): boolean {
  const value = import.meta.env.VITE_DEMO;
  return value === "1" || value === "true";
}

// Resolved once at startup: demo vs. live is a per-session decision and toggling
// it later would mix frozen and live data mid-flight.
const enabled = readEnvFlag() || readUrlFlag();

export function isDemoMode(): boolean {
  return enabled;
}

/**
 * Lazily load the demo data layer (the snapshot interpreter and loader). It is
 * imported dynamically so it — and the whole `api`/`snapshot` graph — is
 * code-split into its own chunk and only downloaded when demo mode is active,
 * keeping it out of the main bundle for live sessions. Call sites are already
 * `async`, so `(await loadDemoApi()).query(…)` reads as a one-line guard.
 */
export function loadDemoApi(): Promise<typeof import("./api")> {
  return import("./api");
}
