// Soil-probe field: the city's soil probes drawn as nearest-probe (Thiessen /
// Voronoi) regions, for one quantity at one depth band.
//
// A sibling of TemperatureFieldView — same MapLibre field controller, baseline
// controls and legend — with the depth dimension the soil probes actually have.
// Three things make the bands legible at once: the strip switches the band on a
// scale shared by all of them, a clicked probe's popup lists its whole column,
// and the summary table shows every band's city-wide spread.
//
// The quantities come from the soil category's `depthProfiles` (config/layers.ts)
// rather than being named here, so a third banded quantity would appear on its
// own.

import { useEffect, useMemo } from "react";
import { KernBadge } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { fetchSensors } from "../api/sensorcity";
import { FieldBaselineControls } from "../components/FieldBaselineControls";
import { FieldLegend } from "../components/FieldLegend";
import { SoilBandSummary } from "../components/SoilBandSummary";
import { SoilFieldControls } from "../components/SoilFieldControls";
import { AsyncBoundary, Empty } from "../components/Status";
import {
  categoryLabelKey,
  depthProfileLabelKey,
  SOIL_CATEGORY_KEY,
  SOIL_TEMPERATURE_PROFILE_KEY,
} from "../config/layers";
import { useAsync } from "../hooks/useAsync";
import { useFieldController } from "../hooks/useFieldController";
import { useMapLibreMap } from "../hooks/useMapLibreMap";
import { useSoilFieldModel } from "../hooks/useSoilFieldModel";
import { useSoilFieldSelection } from "../hooks/useSoilFieldSelection";
import type { DepthProfile } from "../types";
import { buildSensorPopupHtml, type PopupDetailRow } from "../utils/maplibreMarkers";
import { formatSoilDelta, formatSoilValue } from "../utils/soilFieldFormat";
import {
  getSoilBandStats,
  getSoilFieldPoints,
  getSoilProfiles,
  getSoilProbeReadings,
  type SoilFieldPoint,
} from "../utils/soilFieldReadings";

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
  const sensors = useAsync(fetchSensors, []);

  // Soil temperature leads: it is the quantity this page was built for, and the
  // config's own order is a data-model concern rather than a UI one.
  const { profile, bandIndex, setProfileKey, setBand } = useSoilFieldSelection(
    profiles,
    SOIL_TEMPERATURE_PROFILE_KEY,
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
    baselineId,
    setBaselineId,
    selectBaseline,
    baselineOptions,
    baselineLabel,
    baselineValue,
    showLabels,
    setShowLabels,
    isDeviationModeActive,
    isBaselineValueUnavailable,
    valueScale,
    scale,
    getColorForValue,
    formatLabelForValue,
  } = useSoilFieldModel(probes, profile, bandIndex);

  const mapHandle = useMapLibreMap();
  const { containerRef, isStyleReady } = mapHandle;

  const fieldControllerRef = useFieldController(
    mapHandle,
    {
      popupClassName: "sensor-popup",
      tooltipClassName: "sensor-tooltip",
      onPopupAction: (properties, popup) => {
        selectBaseline(String(properties.objectId));
        popup.remove();
      },
    },
    points,
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
      getColor: (point) => getColorForValue(point.value),
      getTooltipText: (point) =>
        `${point.sensor.name} — ${formatSoilValue(profile, point.value)} · ${tc(
          "depth.band",
          { band: selectedBand },
        )}`,
      getPopupHtml: (point) => {
        // Hide "set as reference" on the probe that already is the baseline.
        const isCurrentBaseline =
          displayMode === "deviation" &&
          baselineId === String(point.sensor.objectId);
        return buildSensorPopupHtml({
          color: getColorForValue(point.value),
          label: `${soilCategoryLabel} · ${profileLabel}`,
          name: point.sensor.name,
          readingSummary: `${tc("depth.band", { band: selectedBand })}: ${formatSoilValue(
            profile,
            point.value,
          )}`,
          readingTime: point.sensor.measuredAt,
          href: `#/sensor/${point.sensor.objectId}`,
          linkLabel: t("popup.viewDetails"),
          secondaryAction: isCurrentBaseline
            ? undefined
            : { label: t("popup.setReference") },
          detailRows: probeColumnRows(point),
        });
      },
      getLabel: showLabels ? (point) => formatLabelForValue(point.value) : undefined,
      isHighlighted: (point) =>
        displayMode === "deviation" && String(point.sensor.objectId) === baselineId,
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
    baselineId,
    displayMode,
    showLabels,
    getColorForValue,
    formatLabelForValue,
    t,
    tc,
  ]);

  const bandLabel = tc("depth.band", { band: selectedBand });
  const selectedRange = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.map((point) => point.value);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [points]);
  const mapStatus = sensors.loading
    ? t("status.loading")
    : sensors.error
      ? t("status.error")
      : isDeviationModeActive
        ? t("status.deviation", {
            count: points.length,
            band: bandLabel,
            name: baselineLabel,
          })
        : selectedRange
          ? t("status.showingRange", {
              count: points.length,
              band: bandLabel,
              min: formatSoilValue(profile, selectedRange.min),
              max: formatSoilValue(profile, selectedRange.max),
            })
          : t("status.showing", { count: points.length, band: bandLabel });

  return (
    <div>
      <div className="view-header view-header--compact">
        <div className="view-header__lead">
          <KernBadge label={t("badge")} variant="info" />
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
          baselineSelectId="soil-field-baseline-select"
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          baselineId={baselineId}
          onBaselineIdChange={setBaselineId}
          baselineOptions={baselineOptions}
          displayModeLabel={t("baseline.displayModeLabel")}
          valueModeLabel={t("baseline.valueMode")}
          deviationModeLabel={t("baseline.deviationMode")}
          baselineSelectLabel={t("baseline.selectLabel")}
          showLabels={showLabels}
          onShowLabelsChange={setShowLabels}
          showLabelsLabel={t("baseline.showLabels")}
        />

        <div className="result-bar result-bar--compact" role="status" aria-live="polite">
          <span className="kern-body kern-body--small">{mapStatus}</span>
          {isDeviationModeActive && baselineValue != null && (
            <span className="kern-body kern-body--small kern-body--muted">
              {t("baseline.reading", {
                name: baselineLabel,
                band: bandLabel,
                value: formatSoilValue(profile, baselineValue),
              })}
            </span>
          )}
          {isBaselineValueUnavailable && (
            <span className="kern-body kern-body--small kern-body--muted">
              {t("baseline.unavailable", { band: bandLabel })}
            </span>
          )}
        </div>

        <div className="map" ref={containerRef} role="region" aria-label={t("mapAria")} />

        <AsyncBoundary
          state={sensors}
          isEmpty={() => probes.length === 0 || points.length === 0}
          emptyLabel={probes.length === 0 ? t("empty") : t("emptyBand", { band: bandLabel })}
        >
          {() =>
            scale && (
              <FieldLegend
                scale={scale}
                isDeviation={isDeviationModeActive}
                formatValue={(value) => formatSoilValue(profile, value)}
                formatDelta={(delta) => formatSoilDelta(profile, delta)}
                minEndLabel={t(`legend.${profile.ramp}.low`)}
                maxEndLabel={t(`legend.${profile.ramp}.high`)}
                caption={
                  isDeviationModeActive
                    ? t("legend.deviationCaption", {
                        name: baselineLabel,
                        band: bandLabel,
                      })
                    : t("legend.caption", { count: points.length, band: bandLabel })
                }
              />
            )
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
            />
          )}
        </AsyncBoundary>
      </section>
    </div>
  );
}
