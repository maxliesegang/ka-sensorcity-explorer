// Derived state for the soil map: readings or comparison with each probe's own
// history. History is loaded only when requested and reduced to per-band stats;
// map rendering never needs to know how the archive is queried.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchSoilHistoryReferences, type SoilHistoryReferences } from "../api/soilHistory";
import { getCategory, SOIL_CATEGORY_KEY } from "../config/layers";
import type { DepthProfile, FieldDisplayMode } from "../types";
import { formatSoilValue } from "../utils/soilFieldFormat";
import type { SoilFieldPoint, SoilProbeReading } from "../utils/soilFieldReadings";
import { getSoilFieldValues } from "../utils/soilFieldReadings";
import {
  classifySoilReading,
  soilHistoryStatusColor,
  type SoilHistoryStats,
  type SoilHistoryStatus,
} from "../utils/soilHistoryReference";
import { buildSoilValueScale } from "../utils/soilFieldScale";
import { useAsync } from "./useAsync";
import { useFieldLabelVisibility } from "./useFieldLabelVisibility";
import { useFieldToggle } from "./useFieldToggle";
import { useEnumParam } from "./useUrlState";

const SOIL_CELLS_STORAGE_KEY = "soilField.showCells";
const DISPLAY_MODES: FieldDisplayMode[] = ["value", "deviation"];

export function useSoilFieldModel(
  probes: readonly SoilProbeReading[],
  profile: DepthProfile,
  bandIndex: number,
) {
  const { t } = useTranslation("soil");
  const [displayMode, setDisplayMode] = useEnumParam("mode", DISPLAY_MODES, "value");
  const [hasLoadedHistoryReferences, setHasLoadedHistoryReferences] = useState(false);
  const [showLabels, setShowLabels] = useFieldLabelVisibility();
  const [showCells, setShowCells] = useFieldToggle(
    SOIL_CELLS_STORAGE_KEY,
    false,
    "cells",
  );

  const archiveLayerId = getCategory(SOIL_CATEGORY_KEY)?.archiveLayerId;
  const historyState = useAsync(
    (signal, reportProgress) =>
      archiveLayerId == null
        ? Promise.resolve<SoilHistoryReferences>({
            byObjectId: {},
            failedProbeCount: 0,
          })
        : fetchSoilHistoryReferences(
            archiveLayerId,
            probes,
            profile,
            signal,
            reportProgress,
          ),
    [archiveLayerId, profile, probes],
    {
      enabled:
        (displayMode === "deviation" || hasLoadedHistoryReferences) && probes.length > 0,
    },
  );
  useEffect(() => {
    if (historyState.data != null) setHasLoadedHistoryReferences(true);
  }, [historyState.data]);

  const valueScale = useMemo(
    () => buildSoilValueScale(profile.ramp, getSoilFieldValues(probes)),
    [profile.ramp, probes],
  );
  const isHistoryComparisonActive = displayMode === "deviation" && historyState.data != null;
  // The comparison needs the references to exist. Without this, switching to
  // comparison greys every probe to "unavailable" for as long as 30 days × every
  // probe takes to load — the map claiming there is no reference while it is
  // being fetched. Holding the value colours until then keeps the readings the
  // viewer already has on screen, and the switch happens once, when the answer
  // is real.
  const getHistoryReference = useCallback(
    (point: SoilFieldPoint): SoilHistoryStats | null =>
      historyState.data?.byObjectId[String(point.sensor.objectId)]?.[bandIndex] ?? null,
    [historyState.data, bandIndex],
  );

  const getHistoryStatus = useCallback(
    (point: SoilFieldPoint): SoilHistoryStatus =>
      classifySoilReading(point.value, getHistoryReference(point)),
    [getHistoryReference],
  );

  const getColorForPoint = useCallback(
    (point: SoilFieldPoint): string =>
      isHistoryComparisonActive
        ? soilHistoryStatusColor(profile.ramp, getHistoryStatus(point))
        : valueScale?.css(point.value) ?? "",
    [isHistoryComparisonActive, profile.ramp, getHistoryStatus, valueScale],
  );

  const formatLabelForPoint = useCallback(
    (point: SoilFieldPoint): string =>
      isHistoryComparisonActive
        ? t(`reference.status.${getHistoryStatus(point)}.${profile.ramp}`)
        : formatSoilValue(profile, point.value),
    [isHistoryComparisonActive, t, getHistoryStatus, profile],
  );

  const comparedProbeCount = isHistoryComparisonActive
    ? probes.filter(
        (probe) =>
          probe.bandValues[bandIndex] != null &&
          historyState.data?.byObjectId[String(probe.sensor.objectId)]?.[bandIndex] != null,
      ).length
    : 0;

  return {
    displayMode,
    setDisplayMode,
    showLabels,
    setShowLabels,
    showCells,
    setShowCells,
    isHistoryComparisonActive,
    valueScale,
    historyState,
    comparedProbeCount,
    getHistoryReference,
    getHistoryStatus,
    getColorForPoint,
    formatLabelForPoint,
  };
}
