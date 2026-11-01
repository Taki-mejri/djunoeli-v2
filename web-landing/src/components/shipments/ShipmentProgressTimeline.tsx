import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, Truck, X, AlertTriangle } from "lucide-react";
import type { ShipmentStatus, ShipmentStatusHistoryEntry } from "../../lib/shipmentQueries";
import { buildTimeline, TIMELINE_STEP_COUNT, type TimelineStep } from "../../lib/timelineBuilder";
import { dateLocaleTag } from "../../lib/dateLocale";

type Props = {
  currentStatus: ShipmentStatus;
  history: ShipmentStatusHistoryEntry[];
};

export default function ShipmentProgressTimeline({ currentStatus, history }: Props) {
  const { t, i18n } = useTranslation("expediteur");
  const locale = dateLocaleTag(i18n.language);

  const { steps, progressIndex, isFailed, isCancelled } = useMemo(
    () => buildTimeline(currentStatus, history, locale),
    [currentStatus, history, locale]
  );

  // Pourcentage de progression de la barre colorée : jusqu'à l'étape actuelle,
  // ou jusqu'à la dernière étape atteinte avant annulation / échec.
  // Le camion se place EXACTEMENT sur l'étape actuelle.
  const progressPercent =
    currentStatus === "DELIVERED" ? 100 : (progressIndex / (TIMELINE_STEP_COUNT - 1)) * 100;

  return (
    <div className={`progress-timeline ${isCancelled ? "is-cancelled" : ""} ${isFailed ? "is-failed" : ""}`}>
      {/* Bandeau d'alerte si annulé / échec */}
      {isCancelled && (
        <div className="pt-banner pt-banner-error">
          <X size={16} /> {t("timeline.banner.cancelled")}
        </div>
      )}
      {isFailed && (
        <div className="pt-banner pt-banner-warn">
          <AlertTriangle size={16} /> {t("timeline.banner.failed")}
        </div>
      )}

      <div className="pt-track-wrapper">
        {/* Rail gris de fond */}
        <div className="pt-rail" />
        {/* Barre de progression colorée */}
        <div
          className="pt-progress"
          style={{ width: `calc(${progressPercent}% )` }}
        />

        {/* Le petit camion qui glisse */}
        {!isCancelled && currentStatus !== "DELIVERED" && !isFailed && (
          <div
            className="pt-truck"
            style={{ left: `calc(${progressPercent}% )` }}
          >
            <div className="pt-truck-inner">
              <Truck size={18} />
            </div>
          </div>
        )}

        {/* Les 5 marqueurs d'étapes (le dernier peut être un état terminal) */}
        <div className="pt-steps">
          {steps.map((step, i) => (
            <StepMarker key={step.key} step={step} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepMarker({ step, index }: { step: TimelineStep; index: number }) {
  const { t } = useTranslation("expediteur");

  return (
    <div className={`pt-step pt-step-${step.state}`}>
      <div className="pt-step-dot">
        {step.state === "done" ? (
          <Check size={14} strokeWidth={3} />
        ) : step.state === "failed" ? (
          step.key === "CANCELLED" ? <X size={14} strokeWidth={3} /> : <AlertTriangle size={14} />
        ) : step.state === "current" ? (
          <span className="pt-step-num">{index + 1}</span>
        ) : (
          <span className="pt-step-num">{index + 1}</span>
        )}
      </div>
      <div className="pt-step-labels">
        <span className="pt-step-label">{t(step.labelKey)}</span>
        {step.timestamp && <span className="pt-step-time">{step.timestamp}</span>}
        {!step.timestamp && step.state === "future" && <span className="pt-step-time">—</span>}
        {step.hintKey && <span className="pt-step-hint">{t(step.hintKey)}</span>}
      </div>
    </div>
  );
}
