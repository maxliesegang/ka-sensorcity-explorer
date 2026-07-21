import { useEffect, useState } from "react";

import type { ColorScheme } from "../config/basemap";

// Resolves the *effective* colour scheme the same way the app's theme switch does
// (see App.tsx): an explicit `data-kern-theme` on <html> wins; otherwise "system"
// leaves the attribute off and the OS `prefers-color-scheme` decides. Map code
// needs the resolved light/dark value to pick a basemap style, so this collapses
// both signals into one and re-renders when either changes.

function getResolvedColorScheme(): ColorScheme {
  if (typeof window === "undefined") return "light";
  const explicit = document.documentElement.dataset.kernTheme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The active light/dark scheme, tracking both the theme toggle and the OS setting. */
export function useResolvedColorScheme(): ColorScheme {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(getResolvedColorScheme);

  useEffect(() => {
    const updateColorScheme = () => setColorScheme(getResolvedColorScheme());

    // The toggle flips `data-kern-theme` on <html>; the OS setting flips the media query.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", updateColorScheme);
    const observer = new MutationObserver(updateColorScheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-kern-theme"],
    });

    updateColorScheme();
    return () => {
      media.removeEventListener("change", updateColorScheme);
      observer.disconnect();
    };
  }, []);

  return colorScheme;
}
