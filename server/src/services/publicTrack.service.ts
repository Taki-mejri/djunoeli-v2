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
 * Les 6 étapes visibles publiquement (comme la timeline animée),
 * dans l'ordre. On mappe les 10 statuts DB vers ces étapes.
 */
const PUBLIC_STEPS = [
  "CREATED",
  "PICKED_UP",
  "AT_WAREHOUSE",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

/** Mappe un statut DB vers l'index d'étape publique (0..5), ou -1 si spécial */
function stepIndexForStatus(status: string): number {
  switch (status) {
    case "PENDING":
    case "ASSIGNED": // v2 : assigné, pas encore ramassé
    case "AWAITING_PICKUP":
      return 0; // Créé
    case "PICKED_UP":
      return 1; // Ramassé
    case "AT_WAREHOUSE":
      return 2; // Au dépôt
    case "IN_TRANSIT":
      return 3; // En route
    case "OUT_FOR_DELIVERY":
      return 4; // En livraison
    case "DELIVERED":
      return 5; // Livré
    default:
      return -1; // FAILED_DELIVERY, RETURNED, CANCELLED → traités à part
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

  // Construit la progression : pour chaque étape publique, atteinte ou non + date
  // On cherche dans l'historique la première fois qu'un statut correspondant
  // à l'étape a été atteint.
  const stepReachedAt: (string | null)[] = PUBLIC_STEPS.map(() => null);
  for (const h of shipment.statusHistory) {
    const idx = stepIndexForStatus(h.status);
    if (idx >= 0 && stepReachedAt[idx] === null) {
      stepReachedAt[idx] = h.createdAt.toISOString();
    }
  }
  // L'étape "Créé" est toujours atteinte (date de création du colis)
  if (stepReachedAt[0] === null) {
    stepReachedAt[0] = shipment.createdAt.toISOString();
  }

  const steps = PUBLIC_STEPS.map((key, i) => ({
    key,                                   // le front traduit via i18n
    reached: currentStep >= 0 && i <= currentStep,
    current: i === currentStep,
    at: stepReachedAt[i],
  }));

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
