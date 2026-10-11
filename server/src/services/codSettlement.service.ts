import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";
import { formatEUR } from "../lib/money.js";

/* =====================================================
   SOLDES LIVREURS — qui détient combien de cash COD
   ===================================================== */

export async function getLivreurBalances() {
  const livreurs = await prisma.livreur.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      codBalance: true,
      totalDeliveries: true,
      user: { select: { firstName: true, lastName: true, phone: true, email: true } },
    },
    orderBy: { codBalance: "desc" },
  });

  // Dernier reversement par livreur (pour afficher "il y a X jours")
  const lastSettlements = await prisma.livreurCodSettlement.findMany({
    where: { livreurId: { in: livreurs.map((l) => l.id) } },
    select: { livreurId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const lastByLivreur = new Map<string, Date>();
  for (const s of lastSettlements) {
    if (!lastByLivreur.has(s.livreurId)) {
      lastByLivreur.set(s.livreurId, s.createdAt);
    }
  }

  const rows = livreurs.map((l) => ({
    livreurId: l.id,
    firstName: l.user.firstName,
    lastName: l.user.lastName,
    phone: l.user.phone,
    email: l.user.email,
    codBalance: Number(l.codBalance ?? 0),
    totalDeliveries: l.totalDeliveries ?? 0,
    lastSettlementAt: lastByLivreur.get(l.id)?.toISOString() ?? null,
  }));

  const totalToCollect = rows.reduce((sum, r) => sum + r.codBalance, 0);
  const withBalance = rows.filter((r) => r.codBalance > 0).length;

  // Reversé ce mois
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const settledThisMonth = await prisma.livreurCodSettlement.aggregate({
    where: { createdAt: { gte: startOfMonth } },
    _sum: { amount: true },
  });

  return {
    rows,
    summary: {
      totalToCollect,
      settledThisMonth: Number(settledThisMonth._sum.amount ?? 0),
      livreursWithBalance: withBalance,
    },
  };
}

/* =====================================================
   REVERSEMENT LIVREUR — total (défaut) ou partiel
   ===================================================== */

type SettleInput = {
  actorUserId: string;
  livreurId: string;
  amount?: number;
  method?: "CASH" | "BANK_TRANSFER" | "CHECK";
  reference?: string;
  note?: string;
};

export async function settleLivreur(input: SettleInput) {
  const livreur = await prisma.livreur.findFirst({
    where: { id: input.livreurId, deletedAt: null },
    select: {
      id: true,
      codBalance: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!livreur) throw notFound("Livreur introuvable");

  const currentBalance = Number(livreur.codBalance ?? 0);
  if (currentBalance <= 0) {
    throw badRequest("Ce livreur n'a aucun solde COD à reverser.");
  }

  // Montant : total par défaut, sinon le montant demandé (partiel)
  const amount = input.amount ?? currentBalance;

  if (amount > currentBalance + 0.001) {
    throw badRequest(
      `Montant (${formatEUR(amount)}) supérieur au solde du livreur (${formatEUR(currentBalance)}).`
    );
  }

  const livreurName =
    [livreur.user.firstName, livreur.user.lastName].filter(Boolean).join(" ") || "le livreur";

  const result = await prisma.$transaction(async (tx) => {
    // Décrémente le solde du livreur
    const updatedLivreur = await tx.livreur.update({
      where: { id: livreur.id },
      data: { codBalance: { decrement: amount } },
      select: { id: true, codBalance: true },
    });

    // Crée l'enregistrement de reversement
    const settlementData: Prisma.LivreurCodSettlementUncheckedCreateInput = {
      livreurId: livreur.id,
      amount,
      settledById: input.actorUserId,
      method: input.method ?? "CASH",
      reference: input.reference,
      note: input.note,
    };

    const settlement = await tx.livreurCodSettlement.create({
      data: settlementData,
      select: {
        id: true,
        amount: true,
        method: true,
        reference: true,
        createdAt: true,
      },
    });

    return { settlement, remainingBalance: Number(updatedLivreur.codBalance ?? 0) };
  });

  return {
    settlement: result.settlement,
    livreurName,
    amountSettled: amount,
    remainingBalance: result.remainingBalance,
    fullSettlement: result.remainingBalance === 0,
    message:
      result.remainingBalance === 0
        ? `${formatEUR(amount)} reçus de ${livreurName}. Solde soldé.`
        : `${formatEUR(amount)} reçus de ${livreurName}. Reste ${formatEUR(result.remainingBalance)}.`,
  };
}

/* =====================================================
   HISTORIQUE DES REVERSEMENTS LIVREURS
   ===================================================== */

export async function getLivreurSettlements(limit = 50) {
  const settlements = await prisma.livreurCodSettlement.findMany({
    select: {
      id: true,
      amount: true,
      method: true,
      reference: true,
      note: true,
      createdAt: true,
      livreur: {
        select: { id: true, user: { select: { firstName: true, lastName: true } } },
      },
      settledBy: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return settlements.map((s) => ({
    id: s.id,
    amount: Number(s.amount),
    method: s.method,
    reference: s.reference,
    note: s.note,
    createdAt: s.createdAt.toISOString(),
    livreurName:
      [s.livreur?.user.firstName, s.livreur?.user.lastName].filter(Boolean).join(" ") || "—",
    settledByName:
      [s.settledBy?.firstName, s.settledBy?.lastName].filter(Boolean).join(" ") ||
      s.settledBy?.email ||
      "—",
  }));
}

/* =====================================================
   SOLDE DU LIVREUR CONNECTÉ (pour sa PWA)
   ===================================================== */

export async function getMyLivreurBalance(livreurUserId: string) {
  const livreur = await prisma.livreur.findFirst({
    where: { userId: livreurUserId, deletedAt: null },
    select: { id: true, codBalance: true },
  });
  if (!livreur) throw notFound("Profil livreur introuvable");

  const settlements = await prisma.livreurCodSettlement.findMany({
    where: { livreurId: livreur.id },
    select: { id: true, amount: true, method: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    codBalance: Number(livreur.codBalance ?? 0),
    settlements: settlements.map((s) => ({
      id: s.id,
      amount: Number(s.amount),
      method: s.method,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}
