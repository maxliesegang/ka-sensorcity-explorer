// Soil-probe field: the city's soil probes for one quantity at one depth band,
// drawn as points and — when the viewer asks for it — as nearest-probe
// (Thiessen / Voronoi) regions. Points are the default here: the probes are
// sparse enough that shading the whole city from them overstates what they know.
//
// A sibling of TemperatureFieldView — same MapLibre field controller and value
// legend — with the depth dimension the soil probes actually have. Its comparison
// mode is deliberately local: each probe is judged against its own history.
// Three things make the bands legible at once: the strip switches the band on a
// scale shared by all of them, a clicked probe's popup lists its whole column,
// and the summary table shows every band's city-wide spread.
//
// The quantities come from the soil category's `depthProfiles` (config/layers.ts)
// rather than being named here, so a third banded quantity would appear on its
// own.

import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { fetchSensors } from "../api/sensorcity";
import { SOIL_HISTORY_WINDOW_DAYS } from "../api/soilHistory";
import { DataFreshness } from "../components/DataFreshness";
import { FieldBaselineControls } from "../components/FieldBaselineControls";
import { FieldLegend } from "../components/FieldLegend";
import { MapResetViewButton } from "../components/MapResetViewButton";
import { SoilBandSummary } from "../components/SoilBandSummary";
import { SoilComparisonCallout } from "../components/SoilComparisonCallout";
import { SoilFieldControls } from "../components/SoilFieldControls";
import { SoilHistoryGuide } from "../components/SoilHistoryGuide";
import { AsyncBoundary, Empty } from "../components/Status";
import {
  categoryLabelKey,
  depthProfileLabelKey,
  SOIL_CATEGORY_KEY,
  SOIL_MOISTURE_PROFILE_KEY,
} from "../config/layers";
import { useAsync } from "../hooks/useAsync";
import { useFieldController } from "../hooks/useFieldController";
import { useMapLibreMap } from "../hooks/useMapLibreMap";
import { useSoilFieldModel } from "../hooks/useSoilFieldModel";
import { useSoilFieldSelection } from "../hooks/useSoilFieldSelection";
import type { DepthProfile } from "../types";
import { buildSensorPopupHtml, type InteractiveCircleStyle, type PopupDetailRow } from "../utils/maplibreMarkers";
import { formatSoilDelta, formatSoilValue } from "../utils/soilFieldFormat";
import {
  getSoilBandStats,
  getSoilFieldPoints,
  getSoilProfiles,
  getSoilProbeReadings,
  type SoilFieldPoint,
} from "../utils/soilFieldReadings";

const SOIL_MARKER_STYLE: InteractiveCircleStyle = {
  default: { radius: 8, strokeWidth: 2 },
  hovered: { radius: 12, strokeWidth: 3 },
  active: { radius: 14, strokeWidth: 3 },
  highlighted: { radius: 11, strokeWidth: 3 },
  opacity: 0.95,
};

export function SoilFieldView() {
  const { t } = useTranslation("soil");
  const profiles = useMemo(getSoilProfiles, []);

  // The soil category declares its banded quantities in config/layers.ts, so an
  // empty list is a config gap rather than a quiet feed — and the field below
  // needs a profile to select a band from.
  const [firstProfile, ...otherProfiles] = profiles;
  if (!firstProfile) return <Empty label={t("notConfigured")} />;
  return <SoilField profiles={[firstProfile, ...otherProfiles]} />;
}

function SoilField({ profiles }: { profiles: [DepthProfile, ...DepthProfile[]] }) {
  const { t } = useTranslation("soil");
  const { t: tc } = useTranslation("common");
  const sensors = useAsync(fetchSensors, [], { reloadOnFocus: true });

  // Soil moisture leads; the config's own order is a data-model concern rather
  // than a UI one.
  const { profile, bandIndex, setProfileKey, setBand } = useSoilFieldSelection(
    profiles,
    SOIL_MOISTURE_PROFILE_KEY,
  );

  const probes = useMemo(
    () => (sensors.data ? getSoilProbeReadings(sensors.data, profile) : []),
    [sensors.data, profile],
  );
  const points = useMemo(
    () => getSoilFieldPoints(probes, bandIndex),
    [probes, bandIndex],
  );
  const bandStats = useMemo(() => getSoilBandStats(probes, profile), [probes, profile]);

  const {
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
  } = useSoilFieldModel(probes, profile, bandIndex);

  const mapHandle = useMapLibreMap();
  const { containerRef, isStyleReady } = mapHandle;

  const { controllerRef: fieldControllerRef, resetView } = useFieldController(
    mapHandle,
    {
      popupClassName: "sensor-popup",
      tooltipClassName: "sensor-tooltip",
      markerStyle: SOIL_MARKER_STYLE,
    },
    // Extent from every probe, not the band on screen: a probe that can't read
    // the selected band drops out of `points`, and fitting to those would move
    // the map each time the depth changes.
    probes,
  );

  const selectedBand = profile.bands[bandIndex].band;
  const profileLabel = tc(depthProfileLabelKey(profile.key));

  // Redraw whenever the data, the selected band/quantity or the colour model
  // changes. Reads the same accessors as the temperature field, one band deep.
  useEffect(() => {
    const fieldController = fieldControllerRef.current;
    if (!fieldController) return;

    if (points.length === 0 || !valueScale) {
      fieldController.clear();
      return;
    }

    const soilCategoryLabel = tc(categoryLabelKey(SOIL_CATEGORY_KEY));

    // The clicked probe's whole column, so the depth structure of one spot is
    // readable without switching band six times. Coloured on the value scale:
    // in deviation mode the rows still show what the probe measured.
    const probeColumnRows = (point: SoilFieldPoint): PopupDetailRow[] =>
      profile.bands.flatMap((band, index) => {
        const value = point.bandValues[index];
        if (value == null) return [];
        return [
          {
            label: tc("depth.band", { band: band.band }),
            value: formatSoilValue(profile, value),
            color: valueScale.css(value),
            isCurrent: index === bandIndex,
          },
        ];
      });

    fieldController.render<SoilFieldPoint>({
      points,
      getId: (point) => point.sensor.objectId,
      getColor: getColorForPoint,
      getTooltipText: (point) =>
        `${point.sensor.name} — ${formatSoilValue(profile, point.value)} · ${tc(
          "depth.band",
          { band: selectedBand },
        )}`,
      getPopupHtml: (point) => {
        const reference = isHistoryComparisonVisible ? getReference(point) : null;
        const referenceNote = reference
          ? t("popup.reference", {
              status: t(`reference.status.${getStatus(point)}.${profile.ramp}`),
              usualMin: formatSoilValue(profile, reference.lowerQuartile),
              usualMax: formatSoilValue(profile, reference.upperQuartile),
              mean: formatSoilValue(profile, reference.mean),
            })
          : isHistoryComparisonVisible
            ? t("popup.noReference")
            : undefined;
        return buildSensorPopupHtml({
          color: getColorForPoint(point),
          label: `${soilCategoryLabel} · ${profileLabel}`,
          name: point.sensor.name,
          readingSummary: `${tc("depth.band", { band: selectedBand })}: ${formatSoilValue(
            profile,
            point.value,
          )}`,
          readingTime: point.sensor.measuredAt,
          note: referenceNote,
          href: `#/sensor/${point.sensor.objectId}`,
          linkLabel: t("popup.viewDetails"),
          detailRows: probeColumnRows(point),
        });
      },
      getLabel: showLabels ? formatLabelForPoint : undefined,
      showCells,
      getProperties: (point) => ({ objectId: point.sensor.objectId }),
    });

  }, [
    isStyleReady,
    fieldControllerRef,
    points,
    valueScale,
    profile,
    bandIndex,
    selectedBand,
    profileLabel,
    displayMode,
    showLabels,
    showCells,
    isDeviationModeActive,
    isHistoryComparisonVisible,
    getReference,
    getStatus,
    getColorForPoint,
    formatLabelForPoint,
    t,
    tc,
  ]);

  const bandLabel = tc("depth.band", { band: selectedBand });
  const selectedRange = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.map((point) => point.value);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [points]);
  let mapStatus: string;
  if (sensors.loading) {
    mapStatus = t("status.loading");
  } else if (sensors.error) {
    mapStatus = t("status.error");
  } else if (displayMode === "deviation" && history.loading) {
    mapStatus = t("status.referenceLoading");
  } else if (displayMode === "deviation" && history.error) {
    mapStatus = t("status.referenceError");
  } else if (isDeviationModeActive) {
    mapStatus = t("status.reference", {
      count: points.length,
      referenceCount,
      band: bandLabel,
    });
  } else if (selectedRange) {
    mapStatus = t("status.showingRange", {
      count: points.length,
      band: bandLabel,
      min: formatSoilValue(profile, selectedRange.min),
      max: formatSoilValue(profile, selectedRange.max),
    });
  } else {
    mapStatus = t("status.showing", { count: points.length, band: bandLabel });
  }

  return (
    <div>
      <div className="view-header view-header--compact">
        <div className="view-header__lead">
          <h1 className="kern-heading-medium">{t("heading")}</h1>
        </div>
        <p className="kern-body kern-body--muted view-header__intro">
          {t("intro")} {t("introCaveat")} {t("introLinkPrefix")}
          <Link className="kern-link" to="/sensors">
            {t("introLink")}
          </Link>
          .
        </p>
      </div>

      {displayMode === "value" && (
        <SoilComparisonCallout onActivate={() => setDisplayMode("deviation")} />
      )}

      <section className="map-shell" aria-label={t("canvasAria")}>
        <SoilFieldControls
          profileOptions={profiles.map((profile) => ({
            profile,
            label: tc(depthProfileLabelKey(profile.key)),
          }))}
          selectedProfileKey={profile.key}
          onProfileKeyChange={setProfileKey}
          quantityGroupLabel={t("controls.quantityLabel")}
          bands={profile.bands.map((band) => ({
            band: band.band,
            label: tc("depth.band", { band: band.band }),
          }))}
          selectedBand={selectedBand}
          onBandChange={setBand}
          bandLegendLabel={t("controls.bandLabel")}
          shallowestLabel={t("controls.shallowest")}
          deepestLabel={t("controls.deepest")}
        />

        <FieldBaselineControls
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          displayModeLabel={t("baseline.displayModeLabel")}
          valueModeLabel={t("baseline.valueMode")}
          deviationModeLabel={t("baseline.deviationMode")}
          showLabels={showLabels}
          onShowLabelsChange={setShowLabels}
          showLabelsLabel={t("baseline.showLabels")}
          showCells={showCells}
          onShowCellsChange={setShowCells}
          showCellsLabel={t("baseline.showCells")}
        />

        <div className="result-bar result-bar--compact" role="status" aria-live="polite">
          <span className="kern-body kern-body--small">{mapStatus}</span>
          {isDeviationModeActive && (history.data?.failedProbeCount ?? 0) > 0 && (
            <span className="kern-body kern-body--small kern-body--muted">
              {t("reference.partial", { count: history.data?.failedProbeCount ?? 0 })}
            </span>
          )}
          <DataFreshness state={sensors} />
          <MapResetViewButton onReset={resetView} />
        </div>

        <div className="map" ref={containerRef} role="region" aria-label={t("mapAria")} />

        <AsyncBoundary
          state={sensors}
          isEmpty={() => probes.length === 0 || points.length === 0}
          emptyLabel={probes.length === 0 ? t("empty") : t("emptyBand", { band: bandLabel })}
        >
          {() =>
            isHistoryComparisonVisible ? (
              <SoilHistoryGuide
                ramp={profile.ramp}
                heading={t("reference.heading")}
                lowerLabel={t(`reference.status.lower.${profile.ramp}`)}
                normalLabel={t(`reference.status.normal.${profile.ramp}`)}
                higherLabel={t(`reference.status.higher.${profile.ramp}`)}
                unavailableLabel={t("reference.noData")}
                caption={t("reference.caption", {
                  band: bandLabel,
                  days: SOIL_HISTORY_WINDOW_DAYS,
                })}
              />
            ) : valueScale ? (
              <FieldLegend
                scale={valueScale}
                isDeviation={false}
                formatValue={(value) => formatSoilValue(profile, value)}
                formatDelta={(delta) => formatSoilDelta(profile, delta)}
                minEndLabel={t(`legend.${profile.ramp}.low`)}
                maxEndLabel={t(`legend.${profile.ramp}.high`)}
                caption={t("legend.caption", { count: points.length, band: bandLabel })}
              />
            ) : null
          }
        </AsyncBoundary>
      </section>

      <section className="temp-insights-shell" aria-label={t("bands.heading")}>
        <h2 className="kern-heading-large">{t("bands.heading")}</h2>
        <p className="kern-body kern-body--muted">{t("bands.intro")}</p>
        <AsyncBoundary state={sensors} isEmpty={() => bandStats.length === 0} emptyLabel={t("empty")}>
          {() => (
            <SoilBandSummary
              stats={bandStats}
              profile={profile}
              selectedBandIndex={bandIndex}
              getColorForValue={(value) => (valueScale ? valueScale.css(value) : "")}
              onBandChange={setBand}
            />
          )}
        </AsyncBoundary>
      </section>
    </div>
  );
}
