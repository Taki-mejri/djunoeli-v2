import type { ShipmentStatus, ShipmentStatusHistoryEntry } from "./shipmentQueries";

/**
 * Les 6 étapes affichées dans la timeline visuelle.
 * On les MAPPE depuis les statuts métier internes (10 statuts en DB)
 * vers une expérience utilisateur claire et simple (6 étapes).
 */
export type TimelineStepKey =
  | "CREATED"
  | "PICKED_UP"
  | "AT_WAREHOUSE"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED";

export type TimelineStepState = "done" | "current" | "future" | "failed";

export type TimelineStep = {
  key: TimelineStepKey;
  /** Clé i18n du libellé (namespace "expediteur"), traduite par le composant */
  labelKey: string;
  state: TimelineStepState;
  /** Horodatage formaté (ex: "29 juin · 14:00") ou null si pas encore atteint */
  timestamp: string | null;
  /** Clé i18n du texte secondaire ("en cours…", "échec"...) ou null */
  hintKey: string | null;
};

/**
 * Mapping des 10 statuts métier vers les 6 étapes UX.
 * L'index donne l'ordre de progression dans la timeline.
 */
const STATUS_TO_STEP_INDEX: Record<ShipmentStatus, number> = {
  PENDING: 0,            // Créé (en attente d'enlèvement)
  ASSIGNED: 0,           // v2 : livreur assigné, ramassage à venir
  AWAITING_PICKUP: 0,    // Créé, prêt à être ramassé
  PICKED_UP: 1,          // Ramassé
  AT_WAREHOUSE: 2,       // Au dépôt / centre de tri
  IN_TRANSIT: 3,         // En route vers destination
  OUT_FOR_DELIVERY: 4,   // En livraison finale
  DELIVERED: 5,          // Livré
  FAILED_DELIVERY: 4,    // On bloque sur "En livraison" mais en mode failed
  RETURNED: 4,           // Idem
  CANCELLED: 0,          // Annulé — on bloque sur "Créé"
};

export const TIMELINE_STEPS: { key: TimelineStepKey }[] = [
  { key: "CREATED" },
  { key: "PICKED_UP" },
  { key: "AT_WAREHOUSE" },
  { key: "IN_TRANSIT" },
  { key: "OUT_FOR_DELIVERY" },
  { key: "DELIVERED" },
];

/** Map du statut métier vers l'index d'étape concerné (utilisé pour matcher l'historique) */
const STATUS_TO_STEP: Record<ShipmentStatus, TimelineStepKey> = {
  PENDING: "CREATED",
  ASSIGNED: "CREATED",
  AWAITING_PICKUP: "CREATED",
  PICKED_UP: "PICKED_UP",
  AT_WAREHOUSE: "AT_WAREHOUSE",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  FAILED_DELIVERY: "OUT_FOR_DELIVERY",
  RETURNED: "OUT_FOR_DELIVERY",
  CANCELLED: "CREATED",
};

function formatTimestamp(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Construit la timeline à partir du shipment actuel + son historique.
 * Renvoie les 6 étapes prêtes à être affichées.
 */
export function buildTimeline(
  currentStatus: ShipmentStatus,
  history: ShipmentStatusHistoryEntry[],
  locale: string = "de-DE"
): { steps: TimelineStep[]; progressIndex: number; isFailed: boolean; isCancelled: boolean } {
  const currentIndex = STATUS_TO_STEP_INDEX[currentStatus];
  const isFailed = currentStatus === "FAILED_DELIVERY" || currentStatus === "RETURNED";
  const isCancelled = currentStatus === "CANCELLED";

  // Trie l'historique du plus ancien au plus récent pour piocher l'horodatage de chaque étape
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Pour chaque étape, on cherche l'événement le plus ancien qui correspond
  const stepTimestamps: Record<TimelineStepKey, string | null> = {
    CREATED: null,
    PICKED_UP: null,
    AT_WAREHOUSE: null,
    IN_TRANSIT: null,
    OUT_FOR_DELIVERY: null,
    DELIVERED: null,
  };

  for (const entry of sortedHistory) {
    const stepKey = STATUS_TO_STEP[entry.status];
    // On ne garde que la PREMIÈRE occurrence pour chaque étape
    if (stepKey && stepTimestamps[stepKey] === null) {
      stepTimestamps[stepKey] = formatTimestamp(entry.createdAt, locale);
    }
  }

  const steps: TimelineStep[] = TIMELINE_STEPS.map((step, i) => {
    let state: TimelineStepState;
    let hintKey: string | null = null;

    if (isCancelled && i > 0) {
      state = "future";
    } else if (i < currentIndex) {
      state = "done";
    } else if (i === currentIndex) {
      if (isFailed) {
        state = "failed";
        hintKey = currentStatus === "FAILED_DELIVERY" ? "timeline.hints.failed" : "timeline.hints.returned";
      } else if (currentStatus === "DELIVERED") {
        state = "done";
      } else {
        state = "current";
        hintKey = currentStatus === "ASSIGNED" ? "timeline.hints.assigned" : "timeline.hints.inProgress";
      }
    } else {
      state = "future";
    }

    return {
      key: step.key,
      labelKey: `timeline.steps.${step.key}`,
      state,
      timestamp: stepTimestamps[step.key],
      hintKey,
    };
  });

  return { steps, progressIndex: currentIndex, isFailed, isCancelled };
}
