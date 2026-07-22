import { useEffect, useState } from "react";

import {
  getDefaultBaselineId,
  hasBaselineOption,
  type BaselineOption,
} from "../config/temperatureBaselines";
import type { TemperatureDisplayMode } from "../types";

export function useTemperatureBaselineSelection(options: readonly BaselineOption[]) {
  const [displayMode, setDisplayMode] =
    useState<TemperatureDisplayMode>("temperature");
  const [baselineId, setBaselineId] = useState<string | null>(null);

  // Keep a valid baseline selected only when the comparison mode needs one.
  useEffect(() => {
    if (displayMode !== "deviation") return;
    if (hasBaselineOption(options, baselineId)) return;
    setBaselineId(getDefaultBaselineId(options));
  }, [displayMode, options, baselineId]);

  return {
    displayMode,
    setDisplayMode,
    baselineId,
    setBaselineId,
  };
}
