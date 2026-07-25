import {
  getDefaultBaselineId,
  hasBaselineOption,
  type BaselineOption,
} from "../config/temperatureBaselines";
import type { FieldDisplayMode } from "../types";
import { useEnumParam, useUrlState } from "./useUrlState";

const DISPLAY_MODES: FieldDisplayMode[] = ["value", "deviation"];

/**
 * Display mode + baseline for a map field, backed by the URL (`?mode=`,
 * `?baseline=`) so a deviation view is shareable. The effective baseline is
 * derived, not stored: when deviation mode needs one and the URL doesn't name a
 * currently-valid option, we fall back to the default without writing it — that
 * keeps the default out of shared links and self-corrects once the baseline
 * options finish loading.
 */
export function useFieldBaselineSelection(options: readonly BaselineOption[]) {
  const [params, updateParams] = useUrlState();
  const [displayMode, setDisplayMode] = useEnumParam("mode", DISPLAY_MODES, "value");

  const requestedBaseline = params.get("baseline");
  const baselineId: string | null = hasBaselineOption(options, requestedBaseline)
    ? requestedBaseline
    : displayMode === "deviation"
      ? getDefaultBaselineId(options)
      : null;

  function setBaselineId(id: string | null) {
    updateParams({ baseline: id });
  }

  /** Select a baseline and enter deviation mode in one URL update. */
  function selectBaseline(id: string) {
    updateParams({ mode: "deviation", baseline: id });
  }

  return {
    displayMode,
    setDisplayMode,
    baselineId,
    setBaselineId,
    selectBaseline,
  };
}
