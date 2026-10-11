import { prisma } from "../lib/prisma.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";

/* Statuts considérés "au dépôt" (censés être physiquement présents) */
const AT_WAREHOUSE_STATUSES = ["AT_WAREHOUSE"] as const;

/** Résout le dispatcher + son warehouse à partir du userId */
async function resolveDispatcher(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, warehouseId: true, firstName: true, lastName: true },
  });
  if (!user) throw notFound("Utilisateur introuvable");
  return user;
}

/* =====================================================
   Liste des colis attendus au dépôt (+ état vérifié)
   ===================================================== */
export async function getExpectedAtWarehouse(userId: string) {
  const user = await resolveDispatcher(userId);

  const shipments = await prisma.shipment.findMany({
    where: {
      status: { in: [...AT_WAREHOUSE_STATUSES] },
      deletedAt: null,
    },
    select: {
      id: true,
      trackingNumber: true,
      receiverName: true,
      deliveryCity: true,
      isFragile: true,
      codAmount: true,
      verifiedAt: true,
      verifiedById: true,
    },
    orderBy: { verifiedAt: { sort: "asc", nulls: "first" } },
  });

  const rows = shipments.map((s) => ({
    id: s.id,
    trackingNumber: s.trackingNumber,
    receiverName: s.receiverName,
    deliveryCity: s.deliveryCity,
    isFragile: s.isFragile,
    codAmount: Number(s.codAmount ?? 0),
    verified: !!s.verifiedAt,
    verifiedAt: s.verifiedAt?.toISOString() ?? null,
  }));

  return {
    warehouseId: user.warehouseId,
    rows,
    summary: {
      expected: rows.length,
      verified: rows.filter((r) => r.verified).length,
      missing: rows.filter((r) => !r.verified).length,
    },
  };
}

/* =====================================================
   Ouvrir une session d'inventaire
   ===================================================== */
export async function openSession(userId: string, note?: string) {
  const user = await resolveDispatcher(userId);

  // Une seule session ouverte à la fois par dépôt
  const existing = await prisma.inventorySession.findFirst({
    where: { status: "OPEN", warehouseId: user.warehouseId ?? undefined },
    select: { id: true },
  });
  if (existing) {
    throw badRequest("Une session d'inventaire est déjà ouverte. Clôturez-la d'abord.");
  }

  const expectedCount = await prisma.shipment.count({
    where: { status: { in: [...AT_WAREHOUSE_STATUSES] }, deletedAt: null },
  });

  const session = await prisma.inventorySession.create({
    data: {
      warehouseId: user.warehouseId ?? null,
      startedById: user.id,
      status: "OPEN",
      expectedCount,
      verifiedCount: 0,
      note,
    },
    select: { id: true, status: true, expectedCount: true, startedAt: true },
  });

  return { session, message: `Session d'inventaire ouverte (${expectedCount} colis attendus).` };
}

/* =====================================================
   Scanner un colis pour le vérifier
   ===================================================== */
export async function verifyScan(userId: string, sessionId: string, trackingNumber: string) {
  const user = await resolveDispatcher(userId);

  const session = await prisma.inventorySession.findFirst({
    where: { id: sessionId, status: "OPEN" },
    select: { id: true },
  });
  if (!session) throw notFound("Session d'inventaire introuvable ou déjà clôturée");

  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber: trackingNumber.trim(), deletedAt: null },
    select: { id: true, trackingNumber: true, status: true, receiverName: true, deliveryCity: true, verifiedAt: true },
  });
  if (!shipment) throw notFound(`Colis ${trackingNumber} introuvable`);

  // Le colis doit être au dépôt
  if (!AT_WAREHOUSE_STATUSES.includes(shipment.status as typeof AT_WAREHOUSE_STATUSES[number])) {
    throw badRequest(
      `Le colis ${shipment.trackingNumber} n'est pas au dépôt (statut : ${shipment.status}). Il ne fait pas partie de l'inventaire.`
    );
  }

  // Déjà scanné dans cette session ?
  const already = await prisma.inventoryItem.findFirst({
    where: { sessionId, shipmentId: shipment.id },
    select: { id: true },
  });
  if (already) {
    throw badRequest(`Colis ${shipment.trackingNumber} déjà vérifié dans cette session.`);
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Item d'inventaire
    await tx.inventoryItem.create({
      data: { sessionId, shipmentId: shipment.id, verifiedAt: now },
    });

    // Flag sur le colis
    await tx.shipment.update({
      where: { id: shipment.id },
      data: { verifiedAt: now, verifiedById: user.id },
    });

    // Incrémente le compteur de la session
    const updatedSession = await tx.inventorySession.update({
      where: { id: sessionId },
      data: { verifiedCount: { increment: 1 } },
      select: { verifiedCount: true, expectedCount: true },
    });

    return updatedSession;
  });

  return {
    shipment: {
      trackingNumber: shipment.trackingNumber,
      receiverName: shipment.receiverName,
      deliveryCity: shipment.deliveryCity,
    },
    verifiedCount: result.verifiedCount,
    expectedCount: result.expectedCount,
    message: `Colis ${shipment.trackingNumber} vérifié (${result.verifiedCount}/${result.expectedCount}).`,
  };
}

/* =====================================================
   État d'une session (avec colis vérifiés + manquants)
   ===================================================== */
export async function getSessionState(sessionId: string) {
  const session = await prisma.inventorySession.findFirst({
    where: { id: sessionId },
    select: {
      id: true, status: true, expectedCount: true, verifiedCount: true,
      missingCount: true, note: true, startedAt: true, closedAt: true,
      items: {
        select: {
          verifiedAt: true,
          shipment: { select: { trackingNumber: true, receiverName: true, deliveryCity: true } },
        },
        orderBy: { verifiedAt: "desc" },
      },
    },
  });
  if (!session) throw notFound("Session introuvable");

  // Colis encore au dépôt mais non scannés dans cette session = manquants potentiels
  const verifiedShipmentIds = await prisma.inventoryItem.findMany({
    where: { sessionId },
    select: { shipmentId: true },
  });
  const missing = await prisma.shipment.findMany({
    where: {
      status: { in: [...AT_WAREHOUSE_STATUSES] },
      deletedAt: null,
      id: { notIn: verifiedShipmentIds.map((v) => v.shipmentId) },
    },
    select: { trackingNumber: true, receiverName: true, deliveryCity: true },
  });

  return {
    session: {
      id: session.id,
      status: session.status,
      expectedCount: session.expectedCount,
      verifiedCount: session.verifiedCount,
      missingCount: session.status === "CLOSED" ? session.missingCount : missing.length,
      note: session.note,
      startedAt: session.startedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
    },
    verified: session.items.map((i) => ({
      trackingNumber: i.shipment.trackingNumber,
      receiverName: i.shipment.receiverName,
      deliveryCity: i.shipment.deliveryCity,
      verifiedAt: i.verifiedAt.toISOString(),
    })),
    missing: missing.map((m) => ({
      trackingNumber: m.trackingNumber,
      receiverName: m.receiverName,
      deliveryCity: m.deliveryCity,
    })),
  };
}

/* =====================================================
   Clôturer une session
   ===================================================== */
export async function closeSession(sessionId: string, note?: string) {
  const session = await prisma.inventorySession.findFirst({
    where: { id: sessionId, status: "OPEN" },
    select: { id: true },
  });
  if (!session) throw notFound("Session introuvable ou déjà clôturée");

  // Colis attendus non scannés = manquants
  const verifiedShipmentIds = await prisma.inventoryItem.findMany({
    where: { sessionId },
    select: { shipmentId: true },
  });
  const missingCount = await prisma.shipment.count({
    where: {
      status: { in: [...AT_WAREHOUSE_STATUSES] },
      deletedAt: null,
      id: { notIn: verifiedShipmentIds.map((v) => v.shipmentId) },
    },
  });

  const closed = await prisma.inventorySession.update({
    where: { id: sessionId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      missingCount,
      ...(note ? { note } : {}),
    },
    select: { id: true, status: true, verifiedCount: true, expectedCount: true, missingCount: true, closedAt: true },
  });

  return {
    session: closed,
    message:
      missingCount === 0
        ? `Inventaire clôturé : ${closed.verifiedCount}/${closed.expectedCount} vérifiés. Aucun manquant. ✅`
        : `Inventaire clôturé : ${closed.verifiedCount} vérifiés, ${missingCount} manquant(s) ⚠️`,
  };
}

/* =====================================================
   Historique des sessions
   ===================================================== */
export async function getSessionHistory(limit = 30) {
  const sessions = await prisma.inventorySession.findMany({
    select: {
      id: true, status: true, expectedCount: true, verifiedCount: true,
      missingCount: true, startedAt: true, closedAt: true,
      startedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return sessions.map((s) => ({
    id: s.id,
    status: s.status,
    expectedCount: s.expectedCount,
    verifiedCount: s.verifiedCount,
    missingCount: s.missingCount,
    startedAt: s.startedAt.toISOString(),
    closedAt: s.closedAt?.toISOString() ?? null,
    startedByName: [s.startedBy?.firstName, s.startedBy?.lastName].filter(Boolean).join(" ") || "—",
  }));
}

/* =====================================================
   Session ouverte courante (si elle existe)
   ===================================================== */
export async function getCurrentOpenSession(userId: string) {
  const user = await resolveDispatcher(userId);
  const session = await prisma.inventorySession.findFirst({
    where: { status: "OPEN", warehouseId: user.warehouseId ?? undefined },
    select: { id: true, expectedCount: true, verifiedCount: true, startedAt: true },
  });
  return { session };
}
