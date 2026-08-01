import { KernButton } from "@kern-ux-annex/kern-react-kit";
import { useTranslation } from "react-i18next";

export function SoilComparisonCallout({ onActivate }: { onActivate: () => void }) {
  const { t } = useTranslation("soil");

  return (
    <aside className="field-mode-callout" aria-labelledby="soil-comparison-heading">
      <div className="field-mode-callout__text">
        <h2 className="kern-heading-small" id="soil-comparison-heading">
          {t("comparisonCallout.heading")}
        </h2>
        <p className="kern-body">{t("comparisonCallout.hint")}</p>
      </div>
      <KernButton
        type="button"
        variant="primary"
        className="kern-btn--small"
        onClick={onActivate}
        label={t("comparisonCallout.button")}
      />
    </aside>
  );
}
