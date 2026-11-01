import type { Prisma, ShipmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/**
 * ADMIN — tableau d'assignation (remplace l'ancien espace dispatcher).
 * Lectures seules : la liste des colis à assigner + la liste des livreurs.
 * L'assignation elle-même passe par assignToLivreur (deliveryV2.service.ts),
 * exposé sur POST /admin/shipments/:id/assign.
 *
 * Flux v2 (Dortmund) : admin assigne → ASSIGNED, le livreur ramasse au magasin
 * par scan → PICKED_UP. Pas de dépôt, pas de COD.
 */

const ACTIVE_STATUSES: ShipmentStatus[] = ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"];

/* Priorité d'affichage : Express d'abord (le tri par enum en base n'est pas
   fiable, cf. Part 1 — on trie donc en JS). */
function priority(s: { deliveryType: string; status: string }): number {
  const typeRank = s.deliveryType === "EXPRESS" ? 0 : 1;
  const statusRank = s.status === "PENDING" ? 0 : 1; // à assigner avant déjà assignés
  return statusRank * 10 + typeRank;
}

const assignSelect = {
  id: true,
  trackingNumber: true,
  status: true,
  deliveryType: true,
  isFragile: true,
  deliveryCity: true,
  deliveryAddress: true,
  deliveryPrice: true,
  plannedPickupDate: true,
  pickupRound: true,
  assignedAt: true,
  createdAt: true,
  expediteur: { select: { companyName: true, user: { select: { phone: true } } } },
  livreur: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.ShipmentSelect;

type AssignRow = Prisma.ShipmentGetPayload<{ select: typeof assignSelect }>;

function livreurName(u: { firstName: string | null; lastName: string | null } | null | undefined): string {
  if (!u) return "";
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
}

/* =====================================================
   Colis à assigner / réassigner (tout ce qui n'est pas terminé)
   ===================================================== */
export async function listAssignableShipments() {
  const rows = await prisma.shipment.findMany({
    where: {
      deletedAt: null,
      status: { in: ["PENDING", "ASSIGNED"] },
    },
    select: assignSelect,
  });

  const mapped = rows.map((s: AssignRow) => ({
    id: s.id,
    trackingNumber: s.trackingNumber,
    status: s.status,
    deliveryType: s.deliveryType,
    isFragile: s.isFragile,
    deliveryCity: s.deliveryCity,
    deliveryAddress: s.deliveryAddress ?? null,
    deliveryPrice: s.deliveryPrice != null ? Number(s.deliveryPrice) : null,
    plannedPickupDate: s.plannedPickupDate?.toISOString() ?? null,
    pickupRound: s.pickupRound ?? null,
    assignedAt: s.assignedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    storeName: s.expediteur?.companyName ?? "—",
    storePhone: s.expediteur?.user?.phone ?? null,
    livreur: s.livreur
      ? { id: s.livreur.id, name: livreurName(s.livreur.user) || "Livreur" }
      : null,
  }));

  // Express d'abord, à assigner avant assignés, puis plus ancien d'abord.
  mapped.sort((a, b) => {
    const pa = priority({ deliveryType: a.deliveryType, status: a.status });
    const pb = priority({ deliveryType: b.deliveryType, status: b.status });
    if (pa !== pb) return pa - pb;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return mapped;
}

/* =====================================================
   Liste des livreurs (pour le sélecteur d'assignation)
   ===================================================== */
export async function listLivreurs() {
  const livreurs = await prisma.livreur.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      status: true,
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const counts = await prisma.shipment.groupBy({
    by: ["livreurId"],
    where: {
      deletedAt: null,
      status: { in: ACTIVE_STATUSES },
      livreurId: { not: null },
    },
    _count: { _all: true },
  });
  const countMap = new Map<string, number>();
  for (const c of counts) {
    if (c.livreurId) countMap.set(c.livreurId, c._count._all);
  }

  return livreurs.map((l) => ({
    id: l.id,
    name: livreurName(l.user) || "Livreur",
    status: l.status,
    activeJobs: countMap.get(l.id) ?? 0,
  }));
}
