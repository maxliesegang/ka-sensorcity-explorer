import {
  getDefaultBaselineId,
  hasBaselineOption,
  type BaselineOption,
} from "../config/temperatureBaselines";
import type { TemperatureDisplayMode } from "../types";
import { useEnumParam, useUrlState } from "./useUrlState";

const DISPLAY_MODES: TemperatureDisplayMode[] = ["temperature", "deviation"];

/**
 * Display mode + baseline for the temperature field, backed by the URL (`?mode=`,
 * `?baseline=`) so a deviation view is shareable. The effective baseline is
 * derived, not stored: when deviation mode needs one and the URL doesn't name a
 * currently-valid option, we fall back to the default without writing it — that
 * keeps the default out of shared links and self-corrects once the baseline
 * options finish loading.
 */
export function useTemperatureBaselineSelection(options: readonly BaselineOption[]) {
  const [params, updateParams] = useUrlState();
  const [displayMode, setDisplayMode] = useEnumParam(
    "mode",
    DISPLAY_MODES,
    "temperature",
  );

  const requestedBaseline = params.get("baseline");
  const baselineId: string | null = hasBaselineOption(options, requestedBaseline)
    ? requestedBaseline
    : displayMode === "deviation"
      ? getDefaultBaselineId(options)
      : null;

  function setBaselineId(id: string | null) {
    updateParams({ baseline: id });
  }

  return {
    displayMode,
    setDisplayMode,
    baselineId,
    setBaselineId,
  };
}
