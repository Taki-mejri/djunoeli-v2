import { prisma } from "../lib/prisma.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";

/* =====================================================
   COD DÛ AUX EXPÉDITEURS
   Modèle : le prix de livraison EST la commission.
   Sur un colis COD livré : net = COD - frais de livraison.
   ===================================================== */

const DELIVERED_COD_FILTER = {
  status: "DELIVERED" as const,
  deletedAt: null,
  expediteurCodSettledAt: null, // pas encore reversé
  codAmount: { gt: 0 },
};

/** Ce que la boîte doit à chaque expéditeur (COD encaissé - commission) */
export async function getExpediteurCodOwed() {
  const shipments = await prisma.shipment.findMany({
    where: DELIVERED_COD_FILTER,
    select: {
      id: true,
      expediteurId: true,
      codAmount: true,
      deliveryPrice: true,
      trackingNumber: true,
      expediteur: {
        select: { id: true, companyName: true, user: { select: { email: true, phone: true } } },
      },
    },
  });

  // Grouper par expéditeur
  const map = new Map<
    string,
    {
      expediteurId: string;
      companyName: string;
      email: string;
      phone: string | null;
      grossCod: number;
      commission: number;
      netOwed: number;
      shipmentCount: number;
    }
  >();

  for (const s of shipments) {
    if (!s.expediteurId || !s.expediteur) continue;
    const cod = Number(s.codAmount);
    const fee = Number(s.deliveryPrice);
    const existing = map.get(s.expediteurId);
    if (existing) {
      existing.grossCod += cod;
      existing.commission += fee;
      existing.netOwed += cod - fee;
      existing.shipmentCount += 1;
    } else {
      map.set(s.expediteurId, {
        expediteurId: s.expediteurId,
        companyName: s.expediteur.companyName,
        email: s.expediteur.user.email,
        phone: s.expediteur.user.phone,
        grossCod: cod,
        commission: fee,
        netOwed: cod - fee,
        shipmentCount: 1,
      });
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => b.netOwed - a.netOwed);
  const totalNetOwed = rows.reduce((sum, r) => sum + r.netOwed, 0);
  const totalGross = rows.reduce((sum, r) => sum + r.grossCod, 0);
  const totalCommission = rows.reduce((sum, r) => sum + r.commission, 0);

  return {
    rows,
    summary: {
      totalNetOwed,
      totalGross,
      totalCommission,
      expediteursWithBalance: rows.length,
    },
  };
}

/* =====================================================
   REVERSER LE COD À UN EXPÉDITEUR
   ===================================================== */

type SettleExpInput = {
  actorUserId: string;
  expediteurId: string;
  method?: "CASH" | "BANK_TRANSFER" | "CHECK";
  reference?: string;
  note?: string;
};

export async function settleExpediteurCod(input: SettleExpInput) {
  const expediteur = await prisma.expediteur.findFirst({
    where: { id: input.expediteurId, deletedAt: null },
    select: { id: true, companyName: true },
  });
  if (!expediteur) throw notFound("Expéditeur introuvable");

  // Colis COD livrés non encore réglés
  const shipments = await prisma.shipment.findMany({
    where: { ...DELIVERED_COD_FILTER, expediteurId: input.expediteurId },
    select: { id: true, codAmount: true, deliveryPrice: true, deliveredAt: true },
  });

  if (shipments.length === 0) {
    throw badRequest("Aucun COD à reverser pour cet expéditeur.");
  }

  const grossCod = shipments.reduce((sum, s) => sum + Number(s.codAmount), 0);
  const commission = shipments.reduce((sum, s) => sum + Number(s.deliveryPrice), 0);
  const netAmount = grossCod - commission;
  const now = new Date();
  const deliveredDates = shipments.map((s) => s.deliveredAt ?? now);
  const periodFrom = new Date(Math.min(...deliveredDates.map((d) => d.getTime())));
  const periodTo = new Date(Math.max(...deliveredDates.map((d) => d.getTime())));

  const result = await prisma.$transaction(async (tx) => {
    // Créer le règlement (modèle CodSettlement original — usage expéditeur)
    const settlement = await tx.codSettlement.create({
      data: {
        expediteurId: input.expediteurId,
        grossCod,
        commission,
        netAmount,
        periodFrom,
        periodTo,
        status: "PAID",
        paidAt: now,
        paymentMethod: input.method ?? "BANK_TRANSFER",
        reference: input.reference,
        note: input.note,
        settledById: input.actorUserId,
      },
      select: { id: true, grossCod: true, commission: true, netAmount: true, createdAt: true },
    });

    // Marquer les colis comme réglés + les lier au règlement
    await tx.shipment.updateMany({
      where: { id: { in: shipments.map((s) => s.id) } },
      data: { expediteurCodSettledAt: now },
    });

    return settlement;
  });

  return {
    settlement: result,
    companyName: expediteur.companyName,
    grossCod,
    commission,
    netAmount,
    shipmentCount: shipments.length,
    message: `${netAmount.toFixed(0)} DT reversés à ${expediteur.companyName} (${grossCod.toFixed(0)} COD − ${commission.toFixed(0)} commission).`,
  };
}

/* =====================================================
   HISTORIQUE DES REVERSEMENTS EXPÉDITEURS
   ===================================================== */

export async function getExpediteurSettlements(limit = 50) {
  const settlements = await prisma.codSettlement.findMany({
    select: {
      id: true,
      grossCod: true,
      commission: true,
      netAmount: true,
      paymentMethod: true,
      reference: true,
      createdAt: true,
      expediteur: { select: { companyName: true } },
      settledBy: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return settlements.map((s) => ({
    id: s.id,
    grossCod: Number(s.grossCod),
    commission: Number(s.commission),
    netAmount: Number(s.netAmount),
    method: s.paymentMethod,
    reference: s.reference,
    createdAt: s.createdAt.toISOString(),
    companyName: s.expediteur?.companyName ?? "—",
    settledByName:
      [s.settledBy?.firstName, s.settledBy?.lastName].filter(Boolean).join(" ") ||
      s.settledBy?.email ||
      "—",
  }));
}
