import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notFound, badRequest, conflict, unauthorized } from "../middleware/errorHandler.js";

/* =====================================================
   Helpers
   ===================================================== */

/** Récupère le dispatcher connecté avec son dépôt (warehouse) */
async function getDispatcherContext(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, role: "DISPATCHER" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      warehouseId: true,
      warehouse: { select: { id: true, name: true, city: true, address: true } },
    },
  });
  if (!user) throw unauthorized("Profil dispatcher introuvable");
  if (!user.warehouseId || !user.warehouse) {
    throw badRequest("Vous n'êtes rattaché à aucun dépôt. Contactez l'administrateur.");
  }
  return user;
}

/** Récupère un shipment par tracking number (avec validations communes) */
async function findShipmentByTracking(trackingNumber: string) {
  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber, deletedAt: null },
    select: {
      id: true,
      trackingNumber: true,
      status: true,
      livreurId: true,
      deliveryCity: true,
      receiverName: true,
      isFragile: true,
      deliveryType: true,
      codAmount: true,
      expediteur: { select: { companyName: true } },
    },
  });
  if (!shipment) throw notFound(`Colis ${trackingNumber} introuvable`);
  if (shipment.status === "CANCELLED") {
    throw badRequest(`Le colis ${trackingNumber} est annulé.`);
  }
  if (shipment.status === "DELIVERED") {
    throw badRequest(`Le colis ${trackingNumber} est déjà livré.`);
  }
  return shipment;
}

/* =====================================================
   SCAN 1 — RÉCEPTION (colis arrive au dépôt)
   ===================================================== */

export async function scanReceive(
  userId: string,
  input: { trackingNumber: string; zone?: string; note?: string }
) {
  const dispatcher = await getDispatcherContext(userId);
  const shipment = await findShipmentByTracking(input.trackingNumber);

  // Empêche de re-scanner un colis déjà au dépôt
  if (shipment.status === "AT_WAREHOUSE") {
    throw conflict(`Le colis ${input.trackingNumber} est déjà enregistré au dépôt.`);
  }

  // Statuts valides pour une réception : PENDING, AWAITING_PICKUP, PICKED_UP, IN_TRANSIT
  const allowedStatuses = ["PENDING", "AWAITING_PICKUP", "PICKED_UP", "IN_TRANSIT"];
  if (!allowedStatuses.includes(shipment.status)) {
    throw badRequest(
      `Statut "${shipment.status}" incompatible avec une réception. Ce colis est peut-être déjà en livraison.`
    );
  }

  const noteBase = `Reçu au dépôt ${dispatcher.warehouse!.name}`;
  const noteFull = [
    noteBase,
    input.zone ? `zone ${input.zone}` : null,
    input.note ?? null,
  ].filter(Boolean).join(" · ");

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.shipment.update({
      where: { id: shipment.id },
      data: { status: "AT_WAREHOUSE" },
      select: shipmentScanReturn,
    });

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        status: "AT_WAREHOUSE",
        note: noteFull,
        location: `${dispatcher.warehouse!.name} (${dispatcher.warehouse!.city})`,
        changedById: userId,
      },
    });

    return updated;
  });

  return {
    shipment: result,
    nextStep: "Triez ce colis vers son gouvernorat de destination.",
  };
}

/* =====================================================
   SCAN 2 — TRI PAR GOUVERNORAT
   ===================================================== */

export async function scanSort(
  userId: string,
  input: { trackingNumber: string; destinationGovernorate: string; note?: string }
) {
  const dispatcher = await getDispatcherContext(userId);
  const shipment = await findShipmentByTracking(input.trackingNumber);

  // Le colis doit être AU DÉPÔT pour être trié
  if (shipment.status !== "AT_WAREHOUSE") {
    throw badRequest(
      `Le colis ${input.trackingNumber} doit d'abord être réceptionné au dépôt avant d'être trié.`
    );
  }

  // Vérifier que le gouvernorat scanné correspond à la destination réelle du colis
  // (sinon on tagge en mismatch dans la note pour traçabilité — mais on accepte le tri)
  const matchesDestination =
    shipment.deliveryCity.toLowerCase() === input.destinationGovernorate.toLowerCase();

  const noteBase = `Trié vers ${input.destinationGovernorate}`;
  const noteFull = [
    noteBase,
    matchesDestination ? null : `⚠ destination réelle : ${shipment.deliveryCity}`,
    input.note ?? null,
  ].filter(Boolean).join(" · ");

  // Pas de changement de statut métier sur le shipment — il reste AT_WAREHOUSE
  // jusqu'à ce qu'un livreur le prenne. On ajoute juste une ligne d'historique.
  await prisma.shipmentStatusHistory.create({
    data: {
      shipmentId: shipment.id,
      status: "AT_WAREHOUSE",
      note: noteFull,
      location: `${dispatcher.warehouse!.name} · bac ${input.destinationGovernorate}`,
      changedById: userId,
    },
  });

  return {
    shipment: {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      deliveryCity: shipment.deliveryCity,
      receiverName: shipment.receiverName,
      isFragile: shipment.isFragile,
      deliveryType: shipment.deliveryType,
    },
    matchesDestination,
    nextStep: matchesDestination
      ? "Tri OK. Le colis attend qu'un livreur le prenne en charge."
      : `Attention : tri vers ${input.destinationGovernorate} mais destination réelle = ${shipment.deliveryCity}.`,
  };
}

/* =====================================================
   SCAN 3 — ASSIGNATION (colis remis au livreur)
   ===================================================== */

export async function scanAssign(
  userId: string,
  input: { trackingNumber: string; livreurId: string; note?: string }
) {
  const dispatcher = await getDispatcherContext(userId);
  const shipment = await findShipmentByTracking(input.trackingNumber);

  // Le colis doit être AT_WAREHOUSE ou AWAITING_PICKUP pour pouvoir être donné à un livreur
  // (on accepte aussi AWAITING_PICKUP pour le cas où l'admin a déjà préassigné un livreur)
  if (shipment.status !== "AT_WAREHOUSE" && shipment.status !== "AWAITING_PICKUP") {
    throw badRequest(
      `Le colis ${input.trackingNumber} doit être au dépôt (statut AT_WAREHOUSE) avant d'être donné à un livreur.`
    );
  }

  // Vérifier le livreur
  const livreur = await prisma.livreur.findFirst({
    where: { id: input.livreurId, deletedAt: null },
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
    throw conflict(`${livreur.user.firstName ?? "Ce livreur"} est hors ligne. Choisissez un livreur disponible.`);
  }

  const livreurName =
    [livreur.user.firstName, livreur.user.lastName].filter(Boolean).join(" ") || "le livreur";

  // Réassignation potentielle ? On libère l'ancien.
  const previousLivreurId = shipment.livreurId;
  const isReassignment = previousLivreurId && previousLivreurId !== input.livreurId;

  const noteBase = `Remis à ${livreurName}`;
  const noteFull = [noteBase, input.note ?? null].filter(Boolean).join(" · ");

  const result = await prisma.$transaction(async (tx) => {
    // Update shipment : livreur assigné + status PICKED_UP
    const updated = await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        livreurId: input.livreurId,
        status: "PICKED_UP",
        pickedUpAt: new Date(),
        verifiedAt: null,      // le colis quitte le dépôt → plus vérifié
        verifiedById: null,
      },
      select: shipmentScanReturn,
    });

    // Marque le livreur BUSY s'il était AVAILABLE
    if (livreur.status === "AVAILABLE") {
      await tx.livreur.update({
        where: { id: input.livreurId },
        data: { status: "BUSY" },
      });
    }

    // Si réassignation : libère l'ancien si plus de colis actifs
    if (isReassignment && previousLivreurId) {
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

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        status: "PICKED_UP",
        note: noteFull,
        location: `${dispatcher.warehouse!.name} · sortie dépôt`,
        changedById: userId,
      },
    });

    return updated;
  });

  return {
    shipment: result,
    livreurName,
    nextStep: `Colis remis à ${livreurName}. Bonne livraison.`,
  };
}

/* =====================================================
   HISTORIQUE — scans du jour pour le dispatcher
   ===================================================== */

export async function getRecentScans(
  userId: string,
  limit = 20,
  filter?: { eventType?: "RECEIVE" | "SORT" | "ASSIGN" }
) {
  const dispatcher = await getDispatcherContext(userId);

  // On récupère les lignes d'historique faites par CE dispatcher
  const entries = await prisma.shipmentStatusHistory.findMany({
    where: {
      changedById: userId,
      ...(filter?.eventType === "RECEIVE"
        ? { status: "AT_WAREHOUSE", note: { contains: "Reçu" } }
        : filter?.eventType === "SORT"
        ? { status: "AT_WAREHOUSE", note: { contains: "Trié" } }
        : filter?.eventType === "ASSIGN"
        ? { status: "PICKED_UP" }
        : {}),
    },
    select: {
      id: true,
      status: true,
      note: true,
      location: true,
      createdAt: true,
      shipment: {
        select: {
          id: true,
          trackingNumber: true,
          deliveryCity: true,
          receiverName: true,
          isFragile: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return { dispatcher, entries };
}

/* =====================================================
   STATS — comptes du jour pour le tableau de bord
   ===================================================== */

export async function getDispatcherStats(userId: string) {
  const dispatcher = await getDispatcherContext(userId);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [received, sorted, assigned, atWarehouseTotal] = await Promise.all([
    prisma.shipmentStatusHistory.count({
      where: {
        changedById: userId,
        status: "AT_WAREHOUSE",
        note: { contains: "Reçu" },
        createdAt: { gte: startOfToday },
      },
    }),
    prisma.shipmentStatusHistory.count({
      where: {
        changedById: userId,
        status: "AT_WAREHOUSE",
        note: { contains: "Trié" },
        createdAt: { gte: startOfToday },
      },
    }),
    prisma.shipmentStatusHistory.count({
      where: {
        changedById: userId,
        status: "PICKED_UP",
        createdAt: { gte: startOfToday },
      },
    }),
    prisma.shipment.count({
      where: { status: "AT_WAREHOUSE", deletedAt: null },
    }),
  ]);

  return {
    dispatcher,
    today: { received, sorted, assigned },
    overall: { atWarehouseTotal },
  };
}

/* =====================================================
   Selection commune pour les retours de scan
   ===================================================== */

const shipmentScanReturn = {
  id: true,
  trackingNumber: true,
  status: true,
  deliveryCity: true,
  receiverName: true,
  receiverPhone: true,
  isFragile: true,
  deliveryType: true,
  codAmount: true,
  livreurId: true,
  expediteur: { select: { companyName: true } },
} satisfies Prisma.ShipmentSelect;

/* =====================================================
   LIVREURS ASSIGNABLES — pour la page Assignation
   ===================================================== */

export async function listAssignableLivreurs(userId: string) {
  // Vérifie que l'appelant est bien un dispatcher rattaché à un dépôt
  await getDispatcherContext(userId);

  const livreurs = await prisma.livreur.findMany({
    where: {
      deletedAt: null,
      user: { status: "ACTIVE" },
    },
    select: {
      id: true,
      status: true,
      rating: true,
      vehicleType: true,
      vehiclePlate: true,
      user: { select: { firstName: true, lastName: true, phone: true } },
    },
  });

  // Compte les colis actifs par livreur pour afficher la charge
  const ids = livreurs.map((l) => l.id);
  const activeCounts = await prisma.shipment.groupBy({
    by: ["livreurId"],
    where: {
      livreurId: { in: ids },
      deletedAt: null,
      status: { in: ["AWAITING_PICKUP", "PICKED_UP", "AT_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY"] },
    },
    _count: { _all: true },
  });
  const countMap = new Map(activeCounts.map((c) => [c.livreurId ?? "", c._count._all]));

  return livreurs
    .map((l) => ({
      id: l.id,
      status: l.status,
      rating: l.rating,
      vehicleType: l.vehicleType,
      vehiclePlate: l.vehiclePlate,
      firstName: l.user.firstName,
      lastName: l.user.lastName,
      phone: l.user.phone,
      activeCount: countMap.get(l.id) ?? 0,
    }))
    // Les disponibles d'abord, puis par charge croissante
    .sort((a, b) => {
      if (a.status === "OFFLINE" && b.status !== "OFFLINE") return 1;
      if (b.status === "OFFLINE" && a.status !== "OFFLINE") return -1;
      return a.activeCount - b.activeCount;
    });
}
