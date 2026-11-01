import type { ShipmentStatus, ShipmentStatusHistoryEntry } from "./shipmentQueries";

/**
 * Timeline v2 (Dortmund) : les 5 étapes du flux réel, sans entrepôt ni transit.
 *
 *   Erstellt → Zugewiesen → Abgeholt (au magasin) → In Zustellung → Zugestellt
 *
 * Branches terminales : un colis annulé, en échec ou retourné garde les
 * étapes déjà atteintes, et son état terminal REMPLACE l'étape finale.
 * Les libellés réutilisent common:status.* (pas de clés dédiées).
 */
const FLOW = ["PENDING", "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

type TerminalStatus = "CANCELLED" | "FAILED_DELIVERY" | "RETURNED";
export type TimelineStepKey = (typeof FLOW)[number] | TerminalStatus;

export type TimelineStepState = "done" | "current" | "future" | "failed";

export type TimelineStep = {
  key: TimelineStepKey;
  /** Clé i18n du libellé (préfixée par son namespace), traduite par le composant */
  labelKey: string;
  state: TimelineStepState;
  /** Horodatage formaté (ex: "29 juin · 14:00") ou null si pas encore atteint */
  timestamp: string | null;
  /** Clé i18n du texte secondaire (namespace "expediteur") ou null */
  hintKey: string | null;
};

/** Nombre d'étapes affichées (l'étape finale peut être remplacée par un état terminal) */
export const TIMELINE_STEP_COUNT = FLOW.length;

/**
 * Index d'étape atteint par chaque statut métier (-1 = état terminal).
 * Les statuts v1 encore présents en base sont rabattus sur l'étape v2 voisine.
 */
const STATUS_TO_STEP_INDEX: Record<ShipmentStatus, number> = {
  PENDING: 0,
  AWAITING_PICKUP: 0,  // legacy v1
  ASSIGNED: 1,
  PICKED_UP: 2,
  AT_WAREHOUSE: 2,     // legacy v1 : entre ramassage et livraison
  IN_TRANSIT: 2,       // legacy v1
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
  CANCELLED: -1,
  FAILED_DELIVERY: -1,
  RETURNED: -1,
};

const TERMINAL_HINT: Record<TerminalStatus, string | null> = {
  CANCELLED: null, // le bandeau « annulé » suffit
  FAILED_DELIVERY: "timeline.hints.failed",
  RETURNED: "timeline.hints.returned",
};

function isTerminal(status: ShipmentStatus): status is TerminalStatus {
  return status === "CANCELLED" || status === "FAILED_DELIVERY" || status === "RETURNED";
}

function formatTimestamp(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Construit la timeline à partir du statut actuel + l'historique.
 * `progressIndex` = dernière étape atteinte (pour la barre de progression).
 */
export function buildTimeline(
  currentStatus: ShipmentStatus,
  history: ShipmentStatusHistoryEntry[],
  locale: string = "de-DE"
): { steps: TimelineStep[]; progressIndex: number; isFailed: boolean; isCancelled: boolean } {
  const terminal = isTerminal(currentStatus) ? currentStatus : null;
  const isFailed = currentStatus === "FAILED_DELIVERY" || currentStatus === "RETURNED";
  const isCancelled = currentStatus === "CANCELLED";

  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Première date à laquelle chaque étape a été atteinte + date de l'état terminal
  const stepTimestamps: (string | null)[] = FLOW.map(() => null);
  let terminalTimestamp: string | null = null;
  let maxReached = 0;
  for (const entry of sortedHistory) {
    const idx = STATUS_TO_STEP_INDEX[entry.status];
    if (idx >= 0) {
      if (stepTimestamps[idx] === null) stepTimestamps[idx] = formatTimestamp(entry.createdAt, locale);
      maxReached = Math.max(maxReached, idx);
    } else if (entry.status === terminal && terminalTimestamp === null) {
      terminalTimestamp = formatTimestamp(entry.createdAt, locale);
    }
  }

  // Colis terminal : on s'arrête à la dernière étape atteinte avant l'incident
  const progressIndex = terminal ? maxReached : STATUS_TO_STEP_INDEX[currentStatus];
  const lastIndex = FLOW.length - 1;

  const steps: TimelineStep[] = FLOW.map((flowKey, i) => {
    // L'état terminal remplace l'étape finale
    if (terminal && i === lastIndex) {
      return {
        key: terminal,
        labelKey: `common:status.${terminal}`,
        state: "failed",
        timestamp: terminalTimestamp,
        hintKey: TERMINAL_HINT[terminal],
      };
    }

    let state: TimelineStepState;
    let hintKey: string | null = null;
    if (terminal) {
      state = i <= progressIndex ? "done" : "future";
    } else if (i < progressIndex) {
      state = "done";
    } else if (i === progressIndex) {
      if (currentStatus === "DELIVERED") {
        state = "done";
      } else {
        state = "current";
        hintKey = currentStatus === "ASSIGNED" ? "timeline.hints.assigned" : "timeline.hints.inProgress";
      }
    } else {
      state = "future";
    }

    return {
      key: flowKey,
      labelKey: `common:status.${flowKey}`,
      state,
      timestamp: stepTimestamps[i],
      hintKey,
    };
  });

  return { steps, progressIndex, isFailed, isCancelled };
}
