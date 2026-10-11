import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";

/* Statuts qui interdisent l'assignation (colis déjà terminé) */
const NON_ASSIGNABLE = ["DELIVERED", "CANCELLED", "RETURNED"] as const;

/* =====================================================
   Colis assignables à distance
   (tout sauf terminés)
   ===================================================== */
export async function getAssignableShipments(search?: string) {
  const where: Prisma.ShipmentWhereInput = {
    deletedAt: null,
    status: { notIn: [...NON_ASSIGNABLE] },
  };

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { trackingNumber: { contains: q, mode: "insensitive" } },
      { receiverName: { contains: q, mode: "insensitive" } },
      { deliveryCity: { contains: q, mode: "insensitive" } },
    ];
  }

  const shipments = await prisma.shipment.findMany({
    where,
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      receiverName: true,
      deliveryCity: true,
      deliveryAddress: true,
      codAmount: true,
      isFragile: true,
      livreurId: true,
      livreur: {
        select: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return shipments.map((s) => ({
    id: s.id,
    trackingNumber: s.trackingNumber,
    status: s.status,
    receiverName: s.receiverName,
    deliveryCity: s.deliveryCity,
    deliveryAddress: s.deliveryAddress,
    codAmount: Number(s.codAmount ?? 0),
    isFragile: s.isFragile,
    currentLivreur: s.livreur
      ? [s.livreur.user.firstName, s.livreur.user.lastName].filter(Boolean).join(" ")
      : null,
  }));
}

/* =====================================================
   Livreurs disponibles pour l'assignation
   ===================================================== */
export async function getAssignableLivreurs() {
  const livreurs = await prisma.livreur.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      status: true,
      vehicleType: true,
      user: { select: { firstName: true, lastName: true, phone: true } },
    },
    orderBy: { status: "asc" },
  });

  return livreurs.map((l) => ({
    id: l.id,
    firstName: l.user.firstName,
    lastName: l.user.lastName,
    phone: l.user.phone,
    vehicleType: l.vehicleType,
    status: l.status,
  }));
}

/* =====================================================
   ASSIGNER À DISTANCE
   ===================================================== */
type RemoteAssignInput = {
  actorUserId: string;
  shipmentId: string;
  livreurId: string;
  reason: string;
};

export async function remoteAssign(input: RemoteAssignInput) {
  // Le colis
  const shipment = await prisma.shipment.findFirst({
    where: { id: input.shipmentId, deletedAt: null },
    select: {
      id: true, trackingNumber: true, status: true,
      receiverName: true, livreurId: true, pickedUpAt: true,
    },
  });
  if (!shipment) throw notFound("Colis introuvable");

  if (NON_ASSIGNABLE.includes(shipment.status as typeof NON_ASSIGNABLE[number])) {
    throw badRequest(
      `Le colis ${shipment.trackingNumber} est ${shipment.status.toLowerCase()} — il ne peut plus être assigné.`
    );
  }

  // Le livreur
  const livreur = await prisma.livreur.findFirst({
    where: { id: input.livreurId, deletedAt: null },
    select: {
      id: true, status: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!livreur) throw notFound("Livreur introuvable");

  const livreurName =
    [livreur.user.firstName, livreur.user.lastName].filter(Boolean).join(" ") || "le livreur";

  // Qui fait l'action (pour la trace)
  const actor = await prisma.user.findFirst({
    where: { id: input.actorUserId },
    select: { firstName: true, lastName: true, role: true },
  });
  const actorName =
    [actor?.firstName, actor?.lastName].filter(Boolean).join(" ") || "un opérateur";

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Si le colis était assigné à un autre livreur, on libère l'ancien
    const previousLivreurId = shipment.livreurId;

    // Met à jour le colis → PICKED_UP + livreur + horodatage ramassage
    const updated = await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: "PICKED_UP",
        livreurId: input.livreurId,
        pickedUpAt: shipment.pickedUpAt ?? now,
        // Sort du dépôt → le flag de vérification inventaire n'a plus lieu d'être
        verifiedAt: null,
        verifiedById: null,
      },
      select: {
        id: true, trackingNumber: true, status: true,
        receiverName: true, deliveryCity: true, codAmount: true,
      },
    });

    // Trace dans l'historique
    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        status: "PICKED_UP",
        note: `Assignation à distance à ${livreurName} par ${actorName} (${actor?.role ?? "?"}). Confirmé par téléphone. Raison : ${input.reason}`,
        changedById: input.actorUserId,
      },
    });

    // Met le livreur en BUSY
    await tx.livreur.update({
      where: { id: input.livreurId },
      data: { status: "BUSY" },
    });

    // Libère l'ancien livreur s'il n'a plus de courses actives
    if (previousLivreurId && previousLivreurId !== input.livreurId) {
      const activeCount = await tx.shipment.count({
        where: {
          livreurId: previousLivreurId,
          deletedAt: null,
          status: { in: ["AWAITING_PICKUP", "PICKED_UP", "AT_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
        },
      });
      if (activeCount === 0) {
        await tx.livreur.update({
          where: { id: previousLivreurId },
          data: { status: "AVAILABLE" },
        });
      }
    }

    return updated;
  });

  return {
    shipment: result,
    livreurName,
    message: `Colis ${shipment.trackingNumber} assigné à distance à ${livreurName}. Il est prêt à livrer.`,
  };
}
