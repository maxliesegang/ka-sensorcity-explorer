// Derived state for the soil map: readings or comparison with each probe's own
// history. History is loaded only when requested and reduced to per-band stats;
// map rendering never needs to know how the archive is queried.

import { useEffect, useMemo, useState } from "react";
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
  const [hasHistoryCache, setHasHistoryCache] = useState(false);
  const [showLabels, setShowLabels] = useFieldLabelVisibility();
  const [showCells, setShowCells] = useFieldToggle(
    SOIL_CELLS_STORAGE_KEY,
    false,
    "cells",
  );

  const archiveLayerId = getCategory(SOIL_CATEGORY_KEY)?.archiveLayerId;
  const history = useAsync(
    (signal) =>
      archiveLayerId == null
        ? Promise.resolve<SoilHistoryReferences>({
            bySensor: {},
            failedProbeCount: 0,
          })
        : fetchSoilHistoryReferences(archiveLayerId, probes, profile, signal),
    [archiveLayerId, profile, probes],
    { enabled: (displayMode === "deviation" || hasHistoryCache) && probes.length > 0 },
  );
  useEffect(() => {
    if (history.data != null) setHasHistoryCache(true);
  }, [history.data]);

  const valueScale = useMemo(
    () => buildSoilValueScale(profile.ramp, getSoilFieldValues(probes)),
    [profile.ramp, probes],
  );
  const isDeviationModeActive = displayMode === "deviation" && history.data != null;
  const isHistoryComparisonVisible = displayMode === "deviation" && history.error == null;

  function getReference(point: SoilFieldPoint): SoilHistoryStats | null {
    return history.data?.bySensor[String(point.sensor.objectId)]?.[bandIndex] ?? null;
  }

  function getStatus(point: SoilFieldPoint): SoilHistoryStatus {
    return classifySoilReading(point.value, getReference(point));
  }

  function getColorForPoint(point: SoilFieldPoint): string {
    return isHistoryComparisonVisible
      ? soilHistoryStatusColor(profile.ramp, getStatus(point))
      : valueScale?.css(point.value) ?? "";
  }

  function formatLabelForPoint(point: SoilFieldPoint): string {
    return isHistoryComparisonVisible
      ? t(`reference.status.${getStatus(point)}.${profile.ramp}`)
      : formatSoilValue(profile, point.value);
  }

  const referenceCount = isDeviationModeActive
    ? probes.filter(
        (probe) =>
          probe.bandValues[bandIndex] != null &&
          history.data?.bySensor[String(probe.sensor.objectId)]?.[bandIndex] != null,
      ).length
    : 0;

  return {
    displayMode,
    setDisplayMode,
    showLabels,
    setShowLabels,
    showCells,
    setShowCells,
    isDeviationModeActive,
    isHistoryComparisonVisible,
    valueScale,
    history,
    referenceCount,
    getReference,
    getStatus,
    getColorForPoint,
    formatLabelForPoint,
  };
}
