import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notFound, badRequest, conflict } from "../middleware/errorHandler.js";
import { makePaginated, parseSort, type Paginated } from "../lib/pagination.js";

/* =====================================================
   Sélections communes
   ===================================================== */

const livreurMiniSelect = {
  id: true,
  status: true,
  rating: true,
  totalDeliveries: true,
  successRate: true,
  codBalance: true,
  vehicleType: true,
  vehiclePlate: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    },
  },
} satisfies Prisma.LivreurSelect;

const livreurJobSelect = {
  id: true,
  trackingNumber: true,
  status: true,
  statusReason: true,
  livreurId: true,
  senderName: true,
  pickupAddress: true,
  pickupCity: true,
  pickupLat: true,
  pickupLng: true,
  receiverName: true,
  receiverPhone: true,
  deliveryAddress: true,
  deliveryCity: true,
  deliveryLat: true,
  deliveryLng: true,
  description: true,
  weight: true,
  isFragile: true,
  codAmount: true,
  deliveryType: true,
  pickedUpAt: true,
  deliveredAt: true,
  createdAt: true,
} satisfies Prisma.ShipmentSelect;

const livreurJobWithHistorySelect = {
  ...livreurJobSelect,
  statusHistory: {
    select: {
      id: true,
      status: true,
      note: true,
      location: true,
      createdAt: true,
      changedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.ShipmentSelect;

const ACTIVE_STATUSES = [
  "AWAITING_PICKUP",
  "PICKED_UP",
  "AT_WAREHOUSE",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
] as const;

/* =====================================================
   ASSIGN — assigne (ou réassigne) un livreur
   ===================================================== */

type AssignContext = {
  actorUserId: string;
  shipmentId: string;
  livreurId: string;
  note?: string;
};

export async function assignLivreurToShipment(ctx: AssignContext) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: ctx.shipmentId, deletedAt: null },
    select: { id: true, status: true, livreurId: true, trackingNumber: true },
  });
  if (!shipment) throw notFound("Colis introuvable");
  if (shipment.status === "DELIVERED") {
    throw badRequest("Impossible d'assigner : ce colis est déjà livré.");
  }
  if (shipment.status === "CANCELLED") {
    throw badRequest("Impossible d'assigner : ce colis est annulé.");
  }

  const livreur = await prisma.livreur.findFirst({
    where: { id: ctx.livreurId, deletedAt: null },
    select: {
      id: true,
      status: true,
      user: { select: { firstName: true, lastName: true, status: true } },
    },
  });
  if (!livreur) throw notFound("Livreur introuvable");
  if (livreur.user.status !== "ACTIVE") {
    throw badRequest("Ce livreur n'est plus actif.");
  }
  if (livreur.status === "OFFLINE") {
    throw conflict("Ce livreur est hors ligne. Choisissez un livreur disponible.");
  }

  const livreurName =
    [livreur.user.firstName, livreur.user.lastName].filter(Boolean).join(" ") || "le livreur";

  const isReassignment = shipment.livreurId && shipment.livreurId !== ctx.livreurId;
  const previousLivreurId = shipment.livreurId;

  const newShipmentStatus =
    shipment.status === "PENDING" || shipment.status === "AWAITING_PICKUP"
      ? "AWAITING_PICKUP"
      : shipment.status;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.shipment.update({
      where: { id: ctx.shipmentId },
      data: { livreurId: ctx.livreurId, status: newShipmentStatus },
      select: livreurJobSelect,
    });

    if (livreur.status === "AVAILABLE") {
      await tx.livreur.update({
        where: { id: ctx.livreurId },
        data: { status: "BUSY" },
      });
    }

    if (isReassignment && previousLivreurId) {
      const activeCount = await tx.shipment.count({
        where: {
          livreurId: previousLivreurId,
          deletedAt: null,
          status: { in: [...ACTIVE_STATUSES] },
        },
      });
      if (activeCount === 0) {
        await tx.livreur.update({
          where: { id: previousLivreurId },
          data: { status: "AVAILABLE" },
        });
      }
    }

    const note = isReassignment
      ? `Réassigné à ${livreurName}${ctx.note ? ` · ${ctx.note}` : ""}`
      : `Assigné à ${livreurName}${ctx.note ? ` · ${ctx.note}` : ""}`;

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: ctx.shipmentId,
        status: newShipmentStatus,
        note,
        changedById: ctx.actorUserId,
      },
    });

    return updated;
  });

  return result;
}

/* =====================================================
   UNASSIGN
   ===================================================== */

export async function unassignLivreurFromShipment(
  shipmentId: string,
  actorUserId: string,
  reason?: string
) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, deletedAt: null },
    select: { id: true, status: true, livreurId: true },
  });
  if (!shipment) throw notFound("Colis introuvable");
  if (!shipment.livreurId) throw badRequest("Ce colis n'a pas de livreur assigné.");
  if (shipment.status === "DELIVERED") {
    throw badRequest("Impossible : colis déjà livré.");
  }

  const previousLivreurId = shipment.livreurId;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.shipment.update({
      where: { id: shipmentId },
      data: { livreurId: null, status: "PENDING" },
      select: livreurJobSelect,
    });

    const activeCount = await tx.shipment.count({
      where: {
        livreurId: previousLivreurId,
        deletedAt: null,
        status: { in: [...ACTIVE_STATUSES] },
      },
    });
    if (activeCount === 0) {
      await tx.livreur.update({
        where: { id: previousLivreurId },
        data: { status: "AVAILABLE" },
      });
    }

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId,
        status: "PENDING",
        note: reason ? `Désassigné · ${reason}` : "Désassigné du livreur",
        changedById: actorUserId,
      },
    });

    return updated;
  });

  return result;
}

/* =====================================================
   SUGGEST — meilleur livreur disponible
   ===================================================== */

export async function suggestBestLivreur(shipmentId: string) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, deletedAt: null },
    select: { id: true },
  });
  if (!shipment) throw notFound("Colis introuvable");

  const livreurs = await prisma.livreur.findMany({
    where: {
      deletedAt: null,
      status: { in: ["AVAILABLE", "BUSY"] },
      user: { status: "ACTIVE" },
    },
    select: livreurMiniSelect,
  });

  if (livreurs.length === 0) {
    return { suggested: null, all: [] };
  }

  const livreurIds = livreurs.map((l) => l.id);
  const activeCounts = await prisma.shipment.groupBy({
    by: ["livreurId"],
    where: {
      livreurId: { in: livreurIds },
      deletedAt: null,
      status: { in: [...ACTIVE_STATUSES] },
    },
    _count: { _all: true },
  });

  const activeCountMap = new Map(activeCounts.map((c) => [c.livreurId ?? "", c._count._all]));

  const scored = livreurs.map((l) => {
    const activeCount = activeCountMap.get(l.id) ?? 0;
    const score = activeCount * 10 + (l.status === "AVAILABLE" ? 0 : 5);
    return { livreur: l, activeCount, score };
  });

  scored.sort((a, b) => a.score - b.score);

  return {
    suggested: scored[0].livreur,
    all: scored.map((s) => ({ ...s.livreur, activeCount: s.activeCount })),
  };
}

/* =====================================================
   LIVREUR — liste ses courses (jobs)
   ===================================================== */

export async function listLivreurJobs(
  livreurUserId: string,
  pagination: { page: number; pageSize: number; search?: string; sort?: string },
  filters: { status?: string }
): Promise<Paginated<Prisma.ShipmentGetPayload<{ select: typeof livreurJobSelect }>>> {
  const livreur = await prisma.livreur.findFirst({
    where: { userId: livreurUserId, deletedAt: null },
    select: { id: true },
  });
  if (!livreur) {
    return makePaginated([], 0, pagination.page, pagination.pageSize);
  }

  const { page, pageSize, search, sort } = pagination;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ShipmentWhereInput = {
    livreurId: livreur.id,
    deletedAt: null,
    ...(filters.status
      ? { status: filters.status as Prisma.ShipmentWhereInput["status"] }
      : { status: { in: [...ACTIVE_STATUSES] } }),
    ...(search
      ? {
          OR: [
            { trackingNumber: { contains: search, mode: "insensitive" } },
            { receiverName: { contains: search, mode: "insensitive" } },
            { deliveryCity: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy = parseSort(sort, ["createdAt", "updatedAt"]);

  const [data, total] = await Promise.all([
    prisma.shipment.findMany({ where, select: livreurJobSelect, orderBy, skip, take: pageSize }),
    prisma.shipment.count({ where }),
  ]);

  return makePaginated(data, total, page, pageSize);
}

export async function getLivreurJob(shipmentId: string, livreurUserId: string) {
  const livreur = await prisma.livreur.findFirst({
    where: { userId: livreurUserId, deletedAt: null },
    select: { id: true },
  });
  if (!livreur) throw notFound("Profil livreur introuvable");

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, deletedAt: null, livreurId: livreur.id },
    select: livreurJobWithHistorySelect,
  });
  if (!shipment) throw notFound("Course introuvable");
  return shipment;
}
