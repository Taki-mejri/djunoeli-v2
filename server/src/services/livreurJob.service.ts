import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";

/* =====================================================
   Transitions valides : depuis → [vers autorisés]
   ===================================================== */

const VALID_TRANSITIONS: Record<string, string[]> = {
  // Si l'admin assigne directement depuis PENDING, le colis est en AWAITING_PICKUP.
  // Le livreur doit pouvoir démarrer sa course depuis là (le colis est chez l'expéditeur,
  // le livreur va le chercher puis passe en route). On autorise donc PICKED_UP (a ramassé
  // chez l'expéditeur) et IN_TRANSIT (démarre directement), plus l'échec.
  AWAITING_PICKUP: ["PICKED_UP", "IN_TRANSIT", "FAILED_DELIVERY"],
  PICKED_UP: ["IN_TRANSIT", "FAILED_DELIVERY"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY"],
  // AT_WAREHOUSE peut arriver si le dispatcher a reçu le colis mais pas encore
  // remis officiellement — on autorise le livreur à démarrer depuis là aussi
  AT_WAREHOUSE: ["IN_TRANSIT", "FAILED_DELIVERY"],
};

const STATUS_LABELS: Record<string, string> = {
  PICKED_UP: "Ramassé",
  IN_TRANSIT: "En route",
  OUT_FOR_DELIVERY: "En livraison",
  DELIVERED: "Livré",
  FAILED_DELIVERY: "Échec de livraison",
};

/** Résout le livreur (et son id) à partir du userId du JWT */
async function resolveLivreur(livreurUserId: string) {
  const livreur = await prisma.livreur.findFirst({
    where: { userId: livreurUserId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!livreur) throw notFound("Profil livreur introuvable");
  return livreur;
}

/* =====================================================
   AVANCER LE STATUT D'UNE COURSE
   ===================================================== */

type AdvanceInput = {
  livreurUserId: string;
  shipmentId: string;
  target: "PICKED_UP" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED_DELIVERY";
  note?: string;
  codCollected?: boolean;
};

export async function advanceJobStatus(input: AdvanceInput) {
  const livreur = await resolveLivreur(input.livreurUserId);

  // Le colis doit appartenir à ce livreur
  const shipment = await prisma.shipment.findFirst({
    where: { id: input.shipmentId, deletedAt: null, livreurId: livreur.id },
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      codAmount: true,
      receiverName: true,
      pickedUpAt: true,
    },
  });
  if (!shipment) throw notFound("Course introuvable ou non assignée à vous");

  // Vérifier la transition
  const allowed = VALID_TRANSITIONS[shipment.status] ?? [];
  if (!allowed.includes(input.target)) {
    throw badRequest(
      `Transition impossible : ${shipment.status} → ${input.target}. Actions possibles : ${allowed.join(", ") || "aucune"}.`
    );
  }

  // En cas d'échec, une note est obligatoire
  if (input.target === "FAILED_DELIVERY" && (!input.note || input.note.trim().length < 3)) {
    throw badRequest("Une raison est obligatoire en cas d'échec de livraison.");
  }

  const codAmount = Number(shipment.codAmount ?? 0);
  const hasCod = codAmount > 0;

  // Si livraison avec COD, on exige la confirmation d'encaissement
  if (input.target === "DELIVERED" && hasCod && input.codCollected !== true) {
    throw badRequest(
      `Ce colis a un COD de ${codAmount.toFixed(0)} DT. Confirmez l'encaissement pour valider la livraison.`
    );
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Construire les data d'update
    const data: Prisma.ShipmentUpdateInput = { status: input.target };

    if (input.target === "DELIVERED") {
      data.deliveredAt = now;
    }
    // Si le livreur ramasse le colis (depuis AWAITING_PICKUP), on horodate le ramassage
    if (input.target === "PICKED_UP" && !shipment.pickedUpAt) {
      data.pickedUpAt = now;
    }

    const updated = await tx.shipment.update({
      where: { id: shipment.id },
      data,
      select: livreurJobReturn,
    });

    // Note d'historique
    let historyNote = STATUS_LABELS[input.target];
    if (input.target === "DELIVERED" && hasCod) {
      historyNote += ` · COD ${codAmount.toFixed(0)} DT encaissé`;
    }
    if (input.note) {
      historyNote += ` · ${input.note}`;
    }

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        status: input.target,
        note: historyNote,
        changedById: input.livreurUserId,
      },
    });

    // Si la course est terminée (livrée ou échec), on gère le livreur + COD
    const isTerminal = input.target === "DELIVERED" || input.target === "FAILED_DELIVERY";

    if (input.target === "DELIVERED" && hasCod && input.codCollected) {
      // Incrémente le solde COD du livreur (espèces qu'il détient)
      await tx.livreur.update({
        where: { id: livreur.id },
        data: {
          codBalance: { increment: codAmount },
          totalDeliveries: { increment: 1 },
        },
      });
    } else if (input.target === "DELIVERED") {
      await tx.livreur.update({
        where: { id: livreur.id },
        data: { totalDeliveries: { increment: 1 } },
      });
    }

    // Si terminal, libère le livreur s'il n'a plus de courses actives
    if (isTerminal) {
      const activeCount = await tx.shipment.count({
        where: {
          livreurId: livreur.id,
          deletedAt: null,
          status: { in: ["AWAITING_PICKUP", "PICKED_UP", "AT_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
        },
      });
      if (activeCount === 0) {
        await tx.livreur.update({
          where: { id: livreur.id },
          data: { status: "AVAILABLE" },
        });
      }
    }

    return updated;
  });

  return {
    shipment: result,
    message:
      input.target === "DELIVERED"
        ? `Colis ${shipment.trackingNumber} livré à ${shipment.receiverName}.`
        : input.target === "FAILED_DELIVERY"
        ? `Échec enregistré pour ${shipment.trackingNumber}.`
        : `Statut mis à jour : ${STATUS_LABELS[input.target]}.`,
  };
}

/* =====================================================
   LOG D'APPEL — le livreur a appelé le destinataire
   ===================================================== */

const CALL_LABELS: Record<string, string> = {
  ANSWERED: "a répondu",
  NO_ANSWER: "pas de réponse",
  WRONG_NUMBER: "mauvais numéro",
  RESCHEDULED: "reporté",
};

export async function logCall(
  livreurUserId: string,
  shipmentId: string,
  outcome: "ANSWERED" | "NO_ANSWER" | "WRONG_NUMBER" | "RESCHEDULED",
  note?: string
) {
  const livreur = await resolveLivreur(livreurUserId);

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, deletedAt: null, livreurId: livreur.id },
    select: { id: true, trackingNumber: true, receiverName: true },
  });
  if (!shipment) throw notFound("Course introuvable ou non assignée à vous");

  const historyNote = [
    `Appel destinataire : ${CALL_LABELS[outcome]}`,
    note ?? null,
  ].filter(Boolean).join(" · ");

  await prisma.shipmentStatusHistory.create({
    data: {
      shipmentId: shipment.id,
      // On garde le statut inchangé — c'est juste un événement d'appel.
      // On lit le statut courant pour le réécrire (l'historique exige un statut).
      status: (
        await prisma.shipment.findUniqueOrThrow({
          where: { id: shipment.id },
          select: { status: true },
        })
      ).status,
      note: historyNote,
      changedById: livreurUserId,
    },
  });

  return { ok: true, message: `Appel enregistré (${CALL_LABELS[outcome]}).` };
}

/* =====================================================
   Selection de retour
   ===================================================== */

const livreurJobReturn = {
  id: true,
  trackingNumber: true,
  status: true,
  statusReason: true,
  receiverName: true,
  receiverPhone: true,
  deliveryAddress: true,
  deliveryCity: true,
  codAmount: true,
  deliveryType: true,
  isFragile: true,
  pickedUpAt: true,
  deliveredAt: true,
} satisfies Prisma.ShipmentSelect;
