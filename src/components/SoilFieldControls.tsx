// The soil field's two selectors: which quantity to draw, and which depth band.
//
// The band strip is ordered shallow→deep with its ends named, because a bare row
// of numbers says nothing about which way is down. Purely presentational — labels
// and state arrive as props, like FieldBaselineControls.

import type { DepthProfile } from "../types";

export interface SoilFieldControlsProps {
  profileOptions: readonly { profile: DepthProfile; label: string }[];
  selectedProfileKey: string;
  onProfileKeyChange: (key: string) => void;
  quantityGroupLabel: string;

  bands: readonly { band: number; label: string }[];
  selectedBand: number;
  onBandChange: (band: number) => void;
  bandLegendLabel: string;
  shallowestLabel: string;
  deepestLabel: string;
}

export function SoilFieldControls({
  profileOptions,
  selectedProfileKey,
  onProfileKeyChange,
  quantityGroupLabel,
  bands,
  selectedBand,
  onBandChange,
  bandLegendLabel,
  shallowestLabel,
  deepestLabel,
}: SoilFieldControlsProps) {
  return (
    <div className="soil-field-controls">
      <div
        className="segmented-control soil-field-controls__quantities"
        role="group"
        aria-label={quantityGroupLabel}
      >
        {profileOptions.map(({ profile, label }) => (
          <button
            key={profile.key}
            type="button"
            className={
              "segmented-control__option" +
              (profile.key === selectedProfileKey
                ? " segmented-control__option--active"
                : "")
            }
            aria-pressed={profile.key === selectedProfileKey}
            onClick={() => onProfileKeyChange(profile.key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="soil-field-controls__bands">
        <span className="kern-label" id="soil-band-strip-label">
          {bandLegendLabel}
        </span>
        <div className="soil-field-controls__strip">
          <span className="kern-body kern-body--small kern-body--muted">
            {shallowestLabel}
          </span>
          <div
            className="segmented-control"
            role="group"
            aria-labelledby="soil-band-strip-label"
          >
            {bands.map((band) => (
              <button
                key={band.band}
                type="button"
                className={
                  "segmented-control__option soil-field-controls__band" +
                  (band.band === selectedBand
                    ? " segmented-control__option--active"
                    : "")
                }
                aria-pressed={band.band === selectedBand}
                title={band.label}
                onClick={() => onBandChange(band.band)}
              >
                <span aria-hidden="true">{band.band}</span>
                <span className="visually-hidden">{band.label}</span>
              </button>
            ))}
          </div>
          <span className="kern-body kern-body--small kern-body--muted">
            {deepestLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
