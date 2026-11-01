import type { ShipmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { historyNote } from "../lib/historyNote.js";
import { notFound, badRequest, forbidden, conflict } from "../middleware/errorHandler.js";
import { refundForCancellation } from "./wallet.service.js";

/**
 * Annulation d'un colis + remboursement wallet par palier (règle C).
 *
 *   PENDING / ASSIGNED          → 100 % remboursé (pas encore ramassé)
 *   PICKED_UP / OUT_FOR_DELIVERY → 50 %  remboursé (le livreur a déjà travaillé)
 *   tout autre statut            → non annulable (livré, échec, retourné, legacy v1…)
 *
 * L'expéditeur ne peut annuler qu'AVANT ramassage (100 %). Après ramassage,
 * seul un admin peut annuler (50 %). Tout est atomique : statut + historique +
 * recrédit wallet + libération du livreur dans une seule transaction.
 */

const REFUND_TIER: Partial<Record<ShipmentStatus, number>> = {
  PENDING: 1,
  ASSIGNED: 1,
  PICKED_UP: 0.5,
  OUT_FOR_DELIVERY: 0.5,
};

const ACTIVE_STATUSES: ShipmentStatus[] = ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"];
const PICKED_STATES: ShipmentStatus[] = ["PICKED_UP", "OUT_FOR_DELIVERY"];

export async function cancelShipment(input: {
  shipmentId: string;
  actorUserId: string;
  byExpediteur: boolean; // true = annulation côté expéditeur (limitée avant ramassage)
  reason?: string;
}) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: input.shipmentId, deletedAt: null },
    select: {
      id: true, trackingNumber: true, status: true,
      expediteurId: true, livreurId: true, deliveryPrice: true,
      expediteur: { select: { userId: true } },
    },
  });
  if (!shipment) throw notFound("Colis introuvable");

  // Propriété : l'expéditeur n'annule que SES colis
  if (input.byExpediteur && shipment.expediteur.userId !== input.actorUserId) {
    throw forbidden("Ce colis ne vous appartient pas");
  }

  const tier = REFUND_TIER[shipment.status];
  if (tier === undefined) {
    throw badRequest(`Colis ${shipment.trackingNumber} déjà terminé (${shipment.status}) — non annulable.`);
  }

  if (input.byExpediteur && PICKED_STATES.includes(shipment.status)) {
    throw badRequest(
      `Colis ${shipment.trackingNumber} déjà ramassé — contactez le support pour l'annuler.`
    );
  }

  // Calcul en centimes : évite les erreurs flottantes (8,35 € × 50 % = 4,18 €, pas 4,17)
  const priceCents = Math.round(Number(shipment.deliveryPrice ?? 0) * 100);
  const refundAmount = Math.round(priceCents * tier) / 100;
  const tierPercent = Math.round(tier * 100);

  const result = await prisma.$transaction(async (tx) => {
    // Passage conditionnel au statut lu : si une autre requête a déjà annulé
    // (ou si le livreur a ramassé entre-temps), count = 0 → aucun double
    // remboursement, aucun mauvais palier.
    const claimed = await tx.shipment.updateMany({
      where: { id: shipment.id, status: shipment.status, deletedAt: null },
      data: { status: "CANCELLED", statusReason: input.reason ?? null },
    });
    if (claimed.count === 0) {
      throw conflict(`Le statut du colis ${shipment.trackingNumber} a changé — rechargez et réessayez.`);
    }

    const note = historyNote("cancelled", {
      percent: tierPercent,
      by: input.byExpediteur ? "expediteur" : "admin",
      reason: input.reason,
    });
    await tx.shipmentStatusHistory.create({
      data: { shipmentId: shipment.id, status: "CANCELLED", note, changedById: input.actorUserId },
    });

    let newBalance: number | null = null;
    if (refundAmount > 0) {
      const r = await refundForCancellation(tx, {
        expediteurId: shipment.expediteurId,
        amount: refundAmount,
        // note neutre (affichée telle quelle dans l'historique wallet, en DE comme en EN)
        note: `${shipment.trackingNumber} · ${tierPercent}%`,
        shipmentId: shipment.id,
        actorUserId: input.actorUserId,
      });
      newBalance = r.newBalance;
    }

    // Libère le livreur s'il n'a plus de courses actives (sans toucher un livreur OFFLINE)
    if (shipment.livreurId) {
      const active = await tx.shipment.count({
        where: { livreurId: shipment.livreurId, deletedAt: null, status: { in: ACTIVE_STATUSES } },
      });
      if (active === 0) {
        await tx.livreur.updateMany({
          where: { id: shipment.livreurId, status: "BUSY" },
          data: { status: "AVAILABLE" },
        });
      }
    }

    return { newBalance };
  });

  return {
    trackingNumber: shipment.trackingNumber,
    refundAmount,
    tierPercent,
    newBalance: result.newBalance,
    message:
      refundAmount > 0
        ? `Colis ${shipment.trackingNumber} annulé — ${refundAmount.toFixed(2)} € remboursés (${tierPercent}%).`
        : `Colis ${shipment.trackingNumber} annulé — aucun remboursement.`,
  };
}
