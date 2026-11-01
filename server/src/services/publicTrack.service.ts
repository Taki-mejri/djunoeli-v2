import { prisma } from "../lib/prisma.js";
import { notFound } from "../middleware/errorHandler.js";

/* =====================================================
   SUIVI PUBLIC D'UN COLIS
   Ne renvoie QUE des données non sensibles.
   Exposé : tracking, statut, ville destination, type, fragile, dates,
            timeline (statut + date, SANS les notes serveur qui peuvent
            contenir des infos sensibles).
   JAMAIS exposé : nom/téléphone destinataire, adresse exacte, COD,
            expéditeur, notes internes.
   ===================================================== */

/**
 * Les 5 étapes visibles publiquement (flux v2, sans entrepôt ni transit),
 * dans l'ordre. Un état terminal (annulé / échec / retourné) remplace
 * l'étape finale. Le front traduit les clés via common.status.*.
 */
const PUBLIC_STEPS = [
  "PENDING",
  "ASSIGNED",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

const TERMINAL_STATUSES = ["CANCELLED", "FAILED_DELIVERY", "RETURNED"];

/** Mappe un statut DB vers l'index d'étape publique (0..4), ou -1 si terminal */
function stepIndexForStatus(status: string): number {
  switch (status) {
    case "PENDING":
    case "AWAITING_PICKUP": // legacy v1
      return 0; // Erstellt
    case "ASSIGNED":
      return 1; // Fahrer zugewiesen
    case "PICKED_UP":
    case "AT_WAREHOUSE":    // legacy v1
    case "IN_TRANSIT":      // legacy v1
      return 2; // Abgeholt (au magasin)
    case "OUT_FOR_DELIVERY":
      return 3; // In Zustellung
    case "DELIVERED":
      return 4; // Zugestellt
    default:
      return -1; // FAILED_DELIVERY, RETURNED, CANCELLED → remplacent l'étape finale
  }
}

export async function getPublicTracking(trackingNumber: string) {
  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber: trackingNumber.trim(), deletedAt: null },
    select: {
      trackingNumber: true,
      status: true,
      deliveryCity: true,       // ville/gouvernorat de destination (OK public)
      deliveryType: true,       // STANDARD | EXPRESS (OK public)
      isFragile: true,          // OK public
      createdAt: true,
      deliveredAt: true,
      // Historique : on ne prend QUE le statut et la date, PAS la note
      statusHistory: {
        select: { status: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!shipment) {
    throw notFound("Aucun colis trouvé avec ce numéro de suivi.");
  }

  const currentStep = stepIndexForStatus(shipment.status);
  const isFailed = shipment.status === "FAILED_DELIVERY";
  const isCancelled = shipment.status === "CANCELLED";
  const isReturned = shipment.status === "RETURNED";

  const terminal = TERMINAL_STATUSES.includes(shipment.status) ? shipment.status : null;

  // Pour chaque étape publique : première date à laquelle elle a été atteinte
  const stepReachedAt: (string | null)[] = PUBLIC_STEPS.map(() => null);
  let maxReached = 0;
  let terminalAt: string | null = null;
  for (const h of shipment.statusHistory) {
    const idx = stepIndexForStatus(h.status);
    if (idx >= 0) {
      if (stepReachedAt[idx] === null) stepReachedAt[idx] = h.createdAt.toISOString();
      maxReached = Math.max(maxReached, idx);
    } else if (h.status === terminal && terminalAt === null) {
      terminalAt = h.createdAt.toISOString();
    }
  }
  // L'étape "Erstellt" est toujours atteinte (date de création du colis)
  if (stepReachedAt[0] === null) {
    stepReachedAt[0] = shipment.createdAt.toISOString();
  }

  // Colis terminal : progression figée à la dernière étape atteinte avant l'incident
  const reachedIndex = terminal ? maxReached : currentStep;
  const lastIndex = PUBLIC_STEPS.length - 1;
  const steps = PUBLIC_STEPS.map((key, i) =>
    terminal && i === lastIndex
      ? { key: terminal, reached: true, current: true, terminal: true, at: terminalAt }
      : {
          key,                               // le front traduit via common.status.*
          reached: i <= reachedIndex,
          current: !terminal && i === currentStep && shipment.status !== "DELIVERED", // livré = terminé, pas « en cours »
          terminal: false,
          at: stepReachedAt[i],
        }
  );

  return {
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,               // le front traduit via common.status.*
    destinationCity: shipment.deliveryCity, // gouvernorat (non traduit)
    deliveryType: shipment.deliveryType,
    isFragile: shipment.isFragile,
    createdAt: shipment.createdAt.toISOString(),
    deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
    // État "spécial" pour l'affichage (échec / annulé / retourné)
    special: isFailed ? "FAILED" : isCancelled ? "CANCELLED" : isReturned ? "RETURNED" : null,
    steps,
  };
}
