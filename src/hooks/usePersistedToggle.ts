// A boolean flag backed by localStorage, for small UI preferences that should
// survive reloads (e.g. "show value labels on a temperature field"). Reads the stored
// value once on mount and writes back on every change. Falls back to
// `defaultValue` when storage is unavailable or holds anything unexpected.

import { useEffect, useState } from "react";

function readStored(key: string, defaultValue: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key);
    if (value === "true") return true;
    if (value === "false") return false;
  } catch {
    // Storage can throw (private mode, blocked cookies) — just use the default.
  }
  return defaultValue;
}

export function usePersistedToggle(
  key: string,
  defaultValue: boolean,
): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => readStored(key, defaultValue));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // Ignore write failures; the in-memory value still drives the UI.
    }
  }, [key, value]);

  return [value, setValue];
}
