import type { Prisma, ShipmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { historyNote } from "../lib/historyNote.js";
import { notFound, badRequest, conflict } from "../middleware/errorHandler.js";

/**
 * Flux de livraison v2 (Dortmund) — SANS dépôt, SANS COD.
 * PENDING → ASSIGNED (admin) → PICKED_UP (livreur scanne au magasin)
 *         → OUT_FOR_DELIVERY → DELIVERED | FAILED_DELIVERY
 * Express : chrono 90 min démarre au PICKED_UP.
 */

const EXPRESS_SLA_MINUTES = Number(process.env.EXPRESS_SLA_MINUTES ?? 90);

/* Transitions autorisées côté livreur */
const LIVREUR_TRANSITIONS: Partial<Record<ShipmentStatus, ShipmentStatus[]>> = {
  ASSIGNED: ["PICKED_UP", "FAILED_DELIVERY"],
  PICKED_UP: ["OUT_FOR_DELIVERY", "FAILED_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY"],
};

const ACTIVE_STATUSES: ShipmentStatus[] = ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"];

/**
 * Statuts depuis lesquels l'admin peut (ré)assigner. On n'assigne PAS un colis
 * PICKED_UP / OUT_FOR_DELIVERY : il est physiquement chez un livreur (et un
 * Express aurait déjà son chrono lancé). FAILED_DELIVERY = nouvelle tentative.
 */
const ASSIGNABLE_STATUSES: ShipmentStatus[] = ["PENDING", "ASSIGNED", "FAILED_DELIVERY"];

/** Heure HH:MM à Dortmund, quel que soit le fuseau du serveur. */
const berlinTime = (d: Date) =>
  d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

async function resolveLivreur(userId: string) {
  const l = await prisma.livreur.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!l) throw notFound("Profil livreur introuvable");
  return l;
}

async function recordHistory(
  tx: Prisma.TransactionClient,
  shipmentId: string,
  status: ShipmentStatus,
  note: string,
  changedById: string
) {
  await tx.shipmentStatusHistory.create({
    data: { shipmentId, status, note, changedById },
  });
}

/* =====================================================
   ADMIN — assigner un colis à un livreur (→ ASSIGNED)
   ===================================================== */
export async function assignToLivreur(input: {
  shipmentId: string;
  livreurId: string;
  actorUserId: string;
  note?: string;
}) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: input.shipmentId, deletedAt: null },
    select: { id: true, status: true, trackingNumber: true, livreurId: true },
  });
  if (!shipment) throw notFound("Colis introuvable");
  if (!ASSIGNABLE_STATUSES.includes(shipment.status)) {
    throw badRequest(
      ["PICKED_UP", "OUT_FOR_DELIVERY"].includes(shipment.status)
        ? `Colis ${shipment.trackingNumber} déjà ramassé par un livreur — non réassignable.`
        : `Colis ${shipment.trackingNumber} terminé — non assignable.`
    );
  }

  const livreur = await prisma.livreur.findFirst({
    where: { id: input.livreurId, deletedAt: null },
    select: { id: true, status: true, user: { select: { firstName: true, lastName: true, status: true } } },
  });
  if (!livreur) throw notFound("Livreur introuvable");
  if (livreur.user.status !== "ACTIVE") throw badRequest("Ce livreur n'est plus actif.");
  if (livreur.status === "OFFLINE") {
    throw conflict("Ce livreur est hors ligne. Choisissez un livreur disponible.");
  }
  const livreurName = [livreur.user.firstName, livreur.user.lastName].filter(Boolean).join(" ") || "livreur";

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const previousLivreurId = shipment.livreurId;

    // Mise à jour conditionnelle : si le statut a changé entre-temps (ex. le
    // livreur vient de scanner), on refuse au lieu d'écraser.
    const res = await tx.shipment.updateMany({
      where: { id: shipment.id, status: shipment.status },
      data: {
        status: "ASSIGNED",
        livreurId: input.livreurId,
        assignedAt: now,
        // Nouvelle tentative : le chrono Express repartira au prochain ramassage
        expressPickupAt: null,
        slaDeadlineAt: null,
        slaBreached: null,
      },
    });
    if (res.count === 0) throw conflict("Le statut du colis vient de changer, rechargez.");
    const s = await tx.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
      select: deliverySelect,
    });
    const reassigned = !!previousLivreurId && previousLivreurId !== input.livreurId;
    await recordHistory(
      tx, shipment.id, "ASSIGNED",
      historyNote(reassigned ? "reassigned" : "assigned", { name: livreurName, reason: input.note }),
      input.actorUserId
    );
    await tx.livreur.update({ where: { id: input.livreurId }, data: { status: "BUSY" } });

    // Libère l'ancien livreur s'il n'a plus de courses actives
    if (previousLivreurId && previousLivreurId !== input.livreurId) {
      const active = await tx.shipment.count({
        where: { livreurId: previousLivreurId, deletedAt: null, status: { in: ACTIVE_STATUSES } },
      });
      if (active === 0) await tx.livreur.update({ where: { id: previousLivreurId }, data: { status: "AVAILABLE" } });
    }
    return s;
  });

  return { shipment: mapJob(updated), livreurName, message: `Colis ${shipment.trackingNumber} assigné à ${livreurName}.` };
}

/* =====================================================
   LIVREUR — ramassage par scan (au magasin) → PICKED_UP
   ===================================================== */
export async function pickupByScan(livreurUserId: string, trackingNumber: string) {
  const livreur = await resolveLivreur(livreurUserId);

  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber: trackingNumber.trim(), deletedAt: null },
    select: { id: true, trackingNumber: true, status: true, livreurId: true, deliveryType: true, pickedUpAt: true },
  });
  if (!shipment) throw notFound(`Colis ${trackingNumber} introuvable`);
  if (shipment.livreurId !== livreur.id) {
    throw badRequest(`Colis ${shipment.trackingNumber} non assigné à vous.`);
  }
  return markPickedUp({ shipment, livreurId: livreur.id, actorUserId: livreurUserId });
}

/**
 * Cœur du ramassage → PICKED_UP (+ chrono si Express). Utilisé par le scan
 * livreur et par l'assignation à distance (le livreur a déjà le colis en main).
 */
async function markPickedUp(input: {
  shipment: { id: string; trackingNumber: string; status: ShipmentStatus; deliveryType: string; pickedUpAt: Date | null };
  livreurId: string;
  actorUserId: string;
  note?: string;
}) {
  const { shipment, livreurId, actorUserId } = input;
  const allowedFromHere = LIVREUR_TRANSITIONS[shipment.status] ?? [];
  if (!allowedFromHere.includes("PICKED_UP")) {
    throw badRequest(`Colis ${shipment.trackingNumber} déjà ramassé ou statut invalide (${shipment.status}).`);
  }

  const now = new Date();
  const isExpress = shipment.deliveryType === "EXPRESS";
  const slaDeadline = isExpress ? new Date(now.getTime() + EXPRESS_SLA_MINUTES * 60_000) : null;

  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.ShipmentUpdateManyMutationInput = {
      status: "PICKED_UP",
      pickedUpAt: shipment.pickedUpAt ?? now,
    };
    if (isExpress) {
      data.expressPickupAt = now;
      data.slaDeadlineAt = slaDeadline;
    }
    // Conditionnel : un double scan simultané ne relance pas le chrono
    const res = await tx.shipment.updateMany({
      where: { id: shipment.id, status: shipment.status, livreurId },
      data,
    });
    if (res.count === 0) throw conflict(`Colis ${shipment.trackingNumber} déjà ramassé.`);
    const s = await tx.shipment.findUniqueOrThrow({ where: { id: shipment.id }, select: deliverySelect });
    await recordHistory(
      tx, shipment.id, "PICKED_UP",
      isExpress && slaDeadline
        ? historyNote("pickedUpExpress", { time: berlinTime(slaDeadline), reason: input.note })
        : historyNote("pickedUp", { reason: input.note }),
      actorUserId
    );
    return s;
  });

  return {
    shipment: mapJob(updated),
    isExpress,
    slaDeadlineAt: slaDeadline?.toISOString() ?? null,
    message: isExpress
      ? `Colis ${shipment.trackingNumber} ramassé — Express, chrono ${EXPRESS_SLA_MINUTES} min lancé.`
      : `Colis ${shipment.trackingNumber} ramassé.`,
  };
}

/* =====================================================
   ADMIN — assignation à distance (le livreur a DÉJÀ le colis en main,
   confirmé par téléphone) : ASSIGNED puis PICKED_UP dans la foulée.
   Le chrono Express démarre à ce moment-là.
   ===================================================== */
export async function assignAndPickupRemote(input: {
  shipmentId: string;
  livreurId: string;
  actorUserId: string;
  note: string;
}) {
  const assigned = await assignToLivreur(input);
  const shipment = await prisma.shipment.findUniqueOrThrow({
    where: { id: input.shipmentId },
    select: { id: true, trackingNumber: true, status: true, deliveryType: true, pickedUpAt: true },
  });
  const picked = await markPickedUp({
    shipment,
    livreurId: input.livreurId,
    actorUserId: input.actorUserId,
    note: "assignation à distance",
  });
  return { ...picked, livreurName: assigned.livreurName };
}

/* =====================================================
   LIVREUR — avancer / livrer / échouer
   ===================================================== */
export async function advanceDelivery(input: {
  livreurUserId: string;
  shipmentId: string;
  target: "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED_DELIVERY";
  reason?: string;
}) {
  const livreur = await resolveLivreur(input.livreurUserId);
  const shipment = await prisma.shipment.findFirst({
    where: { id: input.shipmentId, deletedAt: null, livreurId: livreur.id },
    select: {
      id: true, trackingNumber: true, status: true, deliveryType: true,
      slaDeadlineAt: true, receiverName: true,
    },
  });
  if (!shipment) throw notFound("Course introuvable ou non assignée à vous");

  const allowed = LIVREUR_TRANSITIONS[shipment.status] ?? [];
  if (!allowed.includes(input.target)) {
    throw badRequest(`Transition impossible : ${shipment.status} → ${input.target}.`);
  }
  if (input.target === "FAILED_DELIVERY" && (!input.reason || input.reason.trim().length < 3)) {
    throw badRequest("Une raison est obligatoire en cas d'échec.");
  }

  const now = new Date();
  const isExpress = shipment.deliveryType === "EXPRESS";
  let slaBreached: boolean | null = null;

  const result = await prisma.$transaction(async (tx) => {
    const data: Prisma.ShipmentUpdateManyMutationInput = { status: input.target };
    if (input.target === "DELIVERED") {
      data.deliveredAt = now;
      if (isExpress && shipment.slaDeadlineAt) {
        slaBreached = now.getTime() > new Date(shipment.slaDeadlineAt).getTime();
        data.slaBreached = slaBreached;
      }
    }

    // Conditionnel : un double clic « Livré » n'incrémente pas deux fois totalDeliveries
    const res = await tx.shipment.updateMany({
      where: { id: shipment.id, status: shipment.status, livreurId: livreur.id },
      data,
    });
    if (res.count === 0) throw conflict("Le statut de la course vient de changer, rechargez.");
    const s = await tx.shipment.findUniqueOrThrow({ where: { id: shipment.id }, select: deliverySelect });

    const note =
      input.target === "OUT_FOR_DELIVERY" ? historyNote("outForDelivery", { reason: input.reason })
      : input.target === "FAILED_DELIVERY" ? historyNote("failed", { reason: input.reason })
      : !isExpress ? historyNote("delivered", { reason: input.reason })
      : slaBreached
        ? historyNote("deliveredExpressLate", { minutes: EXPRESS_SLA_MINUTES, reason: input.reason })
        : historyNote("deliveredExpressOnTime", { reason: input.reason });
    await recordHistory(tx, shipment.id, input.target, note, input.livreurUserId);

    // Incrémente le compteur de livraisons sur une livraison réussie
    if (input.target === "DELIVERED") {
      await tx.livreur.update({
        where: { id: livreur.id },
        data: { totalDeliveries: { increment: 1 } },
      });
    }
    // Terminal → libère le livreur s'il n'a plus de courses actives
    if (input.target === "DELIVERED" || input.target === "FAILED_DELIVERY") {
      const active = await tx.shipment.count({
        where: { livreurId: livreur.id, deletedAt: null, status: { in: ACTIVE_STATUSES } },
      });
      if (active === 0) {
        await tx.livreur.update({ where: { id: livreur.id }, data: { status: "AVAILABLE" } });
      }
    }
    return s;
  });

  return {
    shipment: mapJob(result),
    slaBreached,
    message:
      input.target === "DELIVERED"
        ? (isExpress && slaBreached
            ? `Colis ${shipment.trackingNumber} livré — HORS délai Express.`
            : `Colis ${shipment.trackingNumber} livré.`)
        : input.target === "FAILED_DELIVERY"
        ? `Échec enregistré pour ${shipment.trackingNumber}.`
        : `En route vers ${shipment.receiverName}.`,
  };
}

/* =====================================================
   LIVREUR — mes courses (ASSIGNED / PICKED_UP / OUT_FOR_DELIVERY)
   ===================================================== */
export async function getMyJobs(livreurUserId: string) {
  const livreur = await resolveLivreur(livreurUserId);
  const jobs = await prisma.shipment.findMany({
    where: { livreurId: livreur.id, deletedAt: null, status: { in: ACTIVE_STATUSES } },
    select: deliverySelect,
    orderBy: [{ assignedAt: "asc" }, { createdAt: "asc" }],
  });
  // Express d'abord. Tri en JS : en base l'enum DeliveryType est ordonné
  // STANDARD, EXPRESS, SIMPLE (SIMPLE ajouté après coup), donc un ORDER BY
  // deliveryType ne mettrait pas les Express en tête.
  const rank = (t: string) => (t === "EXPRESS" ? 0 : 1);
  return jobs
    .sort((a, b) => rank(a.deliveryType) - rank(b.deliveryType)) // tri stable : garde l'ordre d'assignation
    .map(mapJob);
}

/* =====================================================
   Selection + mapping
   ===================================================== */
const deliverySelect = {
  id: true, trackingNumber: true, status: true, deliveryType: true,
  receiverName: true, receiverPhone: true, deliveryCity: true, deliveryAddress: true,
  isFragile: true, description: true, deliveryPrice: true,
  assignedAt: true, pickedUpAt: true, deliveredAt: true,
  expressPickupAt: true, slaDeadlineAt: true, slaBreached: true,
  senderName: true, senderPhone: true, pickupAddress: true, pickupCity: true,
} satisfies Prisma.ShipmentSelect;

function mapJob(s: Prisma.ShipmentGetPayload<{ select: typeof deliverySelect }>) {
  return {
    id: s.id,
    trackingNumber: s.trackingNumber,
    status: s.status,
    deliveryType: s.deliveryType,
    receiverName: s.receiverName,
    receiverPhone: s.receiverPhone,
    deliveryCity: s.deliveryCity,
    deliveryAddress: s.deliveryAddress,
    isFragile: s.isFragile,
    description: s.description,
    deliveryPrice: Number(s.deliveryPrice),
    // Où ramasser (magasin de l'expéditeur)
    senderName: s.senderName,
    senderPhone: s.senderPhone,
    pickupAddress: s.pickupAddress,
    pickupCity: s.pickupCity,
    assignedAt: s.assignedAt?.toISOString() ?? null,
    pickedUpAt: s.pickedUpAt?.toISOString() ?? null,
    deliveredAt: s.deliveredAt?.toISOString() ?? null,
    expressPickupAt: s.expressPickupAt?.toISOString() ?? null,
    slaDeadlineAt: s.slaDeadlineAt?.toISOString() ?? null,
    slaBreached: s.slaBreached ?? null,
  };
}
