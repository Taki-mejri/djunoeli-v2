import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { assignAndPickupRemote } from "./deliveryV2.service.js";

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
  // v2 : le livreur a déjà le colis en main (confirmé par téléphone) →
  // ASSIGNED puis PICKED_UP via le flux v2, ce qui lance le chrono Express
  // (avant : passage direct en PICKED_UP, sans chrono).
  const actor = await prisma.user.findFirst({
    where: { id: input.actorUserId },
    select: { firstName: true, lastName: true, role: true },
  });
  const actorName =
    [actor?.firstName, actor?.lastName].filter(Boolean).join(" ") || "un opérateur";

  const result = await assignAndPickupRemote({
    shipmentId: input.shipmentId,
    livreurId: input.livreurId,
    actorUserId: input.actorUserId,
    note: `Assignation à distance par ${actorName} (${actor?.role ?? "?"}). Raison : ${input.reason}`,
  });

  return {
    shipment: result.shipment,
    livreurName: result.livreurName,
    message: `Colis ${result.shipment.trackingNumber} assigné à distance à ${result.livreurName}. Il est prêt à livrer.`
      + (result.isExpress ? ` Express : chrono ${Math.round((Date.parse(result.slaDeadlineAt ?? "") - Date.now()) / 60000)} min lancé.` : ""),
  };
}
