import { useEffect, useState } from "react";

import {
  getDefaultBaselineId,
  hasBaselineOption,
  type BaselineOption,
  type TemperatureFieldMode,
} from "../config/temperatureBaselines";

export function useTemperatureBaselineSelection(options: readonly BaselineOption[]) {
  const [mode, setMode] = useState<TemperatureFieldMode>("absolute");
  const [baselineId, setBaselineId] = useState<string | null>(null);

  // Keep a valid baseline selected only when the comparison mode needs one.
  useEffect(() => {
    if (mode !== "deviation") return;
    if (hasBaselineOption(options, baselineId)) return;
    setBaselineId(getDefaultBaselineId(options));
  }, [mode, options, baselineId]);

  return {
    mode,
    setMode,
    baselineId,
    setBaselineId,
  };
}
