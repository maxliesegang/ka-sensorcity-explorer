// The viewer's way back to the full picture.
//
// Maps set their view once and then never move on their own (see
// `useInitialMapView`), which is only humane if there is an explicit way back —
// otherwise a stray scroll strands the viewer. One component so the label, icon
// and weight read the same on every map that offers it.
//
// Dropped straight into a `.result-bar`, it sits at the end of the row after
// however many status phrases the view put in front of it; anywhere else it is
// an ordinary button and the surrounding layout places it.

import { KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

export function MapResetViewButton({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation("common");
  return (
    <KernButton
      type="button"
      variant="secondary"
      className="kern-btn--small map-reset-view"
      onClick={onReset}
      icon="home"
      label={t("mapControls.resetView")}
      title={t("mapControls.resetViewTitle")}
    />
  );
}
