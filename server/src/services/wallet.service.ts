import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";
import { formatEUR } from "../lib/money.js";

/**
 * Bonus de bienvenue offert au PREMIER crédit de solde (en EUR).
 * Configurable via env WELCOME_BONUS_EUR (défaut 20).
 */
const WELCOME_BONUS_EUR = Number(process.env.WELCOME_BONUS_EUR ?? 20);

type Tx = Prisma.TransactionClient;

/* =====================================================
   Résout l'expéditeur à partir d'un userId (son compte)
   ===================================================== */
async function resolveExpediteurByUser(userId: string) {
  const exp = await prisma.expediteur.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, walletBalance: true, firstTopupDone: true, companyName: true },
  });
  if (!exp) throw notFound("Profil expéditeur introuvable");
  return exp;
}

/* =====================================================
   SOLDE + HISTORIQUE (expéditeur connecté)
   ===================================================== */
export async function getMyWallet(userId: string) {
  const exp = await resolveExpediteurByUser(userId);
  const transactions = await prisma.walletTransaction.findMany({
    where: { expediteurId: exp.id },
    select: {
      id: true, type: true, amount: true, balanceAfter: true,
      note: true, shipmentId: true, createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], // id : départage crédit+bonus créés dans la même ms
    take: 50,
  });

  return {
    balance: Number(exp.walletBalance ?? 0),
    firstTopupDone: exp.firstTopupDone,
    transactions: transactions.map(mapTx),
  };
}

/* =====================================================
   SOLDE + HISTORIQUE (vue admin d'un expéditeur)
   ===================================================== */
export async function getWalletByExpediteur(expediteurId: string) {
  const exp = await prisma.expediteur.findFirst({
    where: { id: expediteurId, deletedAt: null },
    select: {
      id: true, walletBalance: true, firstTopupDone: true, companyName: true,
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  if (!exp) throw notFound("Expéditeur introuvable");

  const transactions = await prisma.walletTransaction.findMany({
    where: { expediteurId: exp.id },
    select: {
      id: true, type: true, amount: true, balanceAfter: true, note: true,
      shipmentId: true, createdAt: true,
      createdBy: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], // id : départage crédit+bonus créés dans la même ms
    take: 100,
  });

  return {
    expediteurId: exp.id,
    companyName: exp.companyName,
    email: exp.user.email,
    balance: Number(exp.walletBalance ?? 0),
    firstTopupDone: exp.firstTopupDone,
    transactions: transactions.map((t) => ({
      ...mapTx(t),
      byName: [t.createdBy?.firstName, t.createdBy?.lastName].filter(Boolean).join(" ") || t.createdBy?.email || "—",
    })),
  };
}

/* =====================================================
   LISTE DES WALLETS (admin) — tous les expéditeurs + solde
   ===================================================== */
export async function listWallets() {
  const exps = await prisma.expediteur.findMany({
    where: { deletedAt: null },
    select: {
      id: true, companyName: true, walletBalance: true, firstTopupDone: true,
      user: { select: { email: true } },
    },
    orderBy: { walletBalance: "desc" },
  });
  return exps.map((e) => ({
    expediteurId: e.id,
    companyName: e.companyName,
    email: e.user.email,
    balance: Number(e.walletBalance ?? 0),
    firstTopupDone: e.firstTopupDone,
  }));
}

/* =====================================================
   CRÉDIT ADMIN (+ bonus au premier crédit)
   ===================================================== */
export async function creditWallet(input: {
  expediteurId: string;
  amount: number;
  note?: string;
  actorUserId: string;
}) {
  const exp = await prisma.expediteur.findFirst({
    where: { id: input.expediteurId, deletedAt: null },
    select: { id: true, companyName: true },
  });
  if (!exp) throw notFound("Expéditeur introuvable");

  // Tout se fait en opérations atomiques DANS la transaction : deux crédits
  // simultanés ne peuvent ni s'écraser ni déclencher deux fois le bonus.
  const result = await prisma.$transaction(async (tx) => {
    const created: ReturnType<typeof mapTx>[] = [];

    // 1. Le crédit principal (increment atomique, solde relu depuis la DB)
    let balance = await incrementBalance(tx, exp.id, input.amount);
    created.push(await writeTx(tx, {
      expediteurId: exp.id,
      type: "CREDIT_ADMIN",
      amount: input.amount,
      balanceAfter: balance,
      note: input.note,
      createdById: input.actorUserId,
    }));

    // 2. Bonus de bienvenue si premier crédit. Le flag est « réclamé » par un
    //    updateMany conditionnel : une seule transaction peut le faire passer
    //    de false à true, donc le bonus ne peut être versé qu'une fois.
    const claim = await tx.expediteur.updateMany({
      where: { id: exp.id, firstTopupDone: false },
      data: { firstTopupDone: true },
    });
    let bonusApplied = 0;
    if (claim.count === 1 && WELCOME_BONUS_EUR > 0) {
      balance = await incrementBalance(tx, exp.id, WELCOME_BONUS_EUR);
      bonusApplied = WELCOME_BONUS_EUR;
      created.push(await writeTx(tx, {
        expediteurId: exp.id,
        type: "BONUS",
        amount: WELCOME_BONUS_EUR,
        balanceAfter: balance,
        note: null, // le libellé traduit vient du type BONUS côté front
        createdById: input.actorUserId,
      }));
    }

    return { balance, bonusApplied, transactions: created };
  });

  return {
    companyName: exp.companyName,
    newBalance: result.balance,
    bonusApplied: result.bonusApplied,
    message:
      result.bonusApplied > 0
        ? `${formatEUR(input.amount)} crédités + ${formatEUR(result.bonusApplied)} de bonus. Solde : ${formatEUR(result.balance)}.`
        : `${formatEUR(input.amount)} crédités. Solde : ${formatEUR(result.balance)}.`,
    transactions: result.transactions,
  };
}

/* =====================================================
   REMBOURSEMENT (ex: Express en retard, décision admin)
   ===================================================== */
export async function refundWallet(input: {
  expediteurId: string;
  amount: number;
  note?: string;
  shipmentId?: string;
  actorUserId: string;
}) {
  const exp = await prisma.expediteur.findFirst({
    where: { id: input.expediteurId, deletedAt: null },
    select: { id: true, companyName: true },
  });
  if (!exp) throw notFound("Expéditeur introuvable");

  const { newBalance, txRow } = await prisma.$transaction(async (tx) => {
    const newBalance = await incrementBalance(tx, exp.id, input.amount);
    const txRow = await writeTx(tx, {
      expediteurId: exp.id,
      type: "REFUND",
      amount: input.amount,
      balanceAfter: newBalance,
      note: input.note, // pas de note auto (en français) : le type REFUND est traduit côté front
      shipmentId: input.shipmentId,
      createdById: input.actorUserId,
    });
    return { newBalance, txRow };
  });

  return {
    companyName: exp.companyName,
    newBalance,
    message: `${formatEUR(input.amount)} remboursés à ${exp.companyName}. Solde : ${formatEUR(newBalance)}.`,
    transaction: txRow,
  };
}

/* =====================================================
   DÉBIT POUR CRÉATION DE COLIS
   (utilisé à l'étape 3 — exporté ici, prêt à l'emploi)
   À appeler DANS la transaction de création du colis.
   ===================================================== */
export async function debitForShipment(
  tx: Tx,
  input: { expediteurId: string; amount: number; shipmentId?: string }
) {
  // Débit conditionnel atomique : ne passe que si le solde couvre le montant
  // (pas de lecture-puis-écriture, donc pas de solde négatif en concurrence).
  const debited = await tx.expediteur.updateMany({
    where: { id: input.expediteurId, deletedAt: null, walletBalance: { gte: input.amount } },
    data: { walletBalance: { decrement: input.amount } },
  });
  if (debited.count === 0) {
    const exp = await tx.expediteur.findFirst({
      where: { id: input.expediteurId, deletedAt: null },
      select: { walletBalance: true },
    });
    if (!exp) throw notFound("Expéditeur introuvable");
    throw badRequest(
      `Solde insuffisant. Solde : ${formatEUR(Number(exp.walletBalance))}, requis : ${formatEUR(input.amount)}. Rechargez votre portefeuille.`
    );
  }

  const after = await tx.expediteur.findUniqueOrThrow({
    where: { id: input.expediteurId },
    select: { walletBalance: true },
  });
  const newBalance = Number(after.walletBalance);
  await writeTx(tx, {
    expediteurId: input.expediteurId,
    type: "DEBIT_SHIPMENT",
    amount: -input.amount,
    balanceAfter: newBalance,
    note: null, // le type DEBIT_SHIPMENT est traduit côté front
    shipmentId: input.shipmentId,
  });

  return { newBalance };
}

/* =====================================================
   Helpers
   ===================================================== */

/** Ajoute `amount` au solde de façon atomique et renvoie le nouveau solde. */
async function incrementBalance(tx: Tx, expediteurId: string, amount: number): Promise<number> {
  const row = await tx.expediteur.update({
    where: { id: expediteurId },
    data: { walletBalance: { increment: amount } },
    select: { walletBalance: true },
  });
  return Number(row.walletBalance);
}
async function writeTx(
  tx: Tx,
  data: {
    expediteurId: string;
    type: string;
    amount: number;
    balanceAfter: number;
    note?: string | null;
    shipmentId?: string;
    createdById?: string;
  }
) {
  const row = await tx.walletTransaction.create({
    data: {
      expediteurId: data.expediteurId,
      type: data.type,
      amount: data.amount,
      balanceAfter: data.balanceAfter,
      note: data.note,
      shipmentId: data.shipmentId,
      createdById: data.createdById,
    },
    select: {
      id: true, type: true, amount: true, balanceAfter: true,
      note: true, shipmentId: true, createdAt: true,
    },
  });
  return mapTx(row);
}

function mapTx(t: {
  id: string; type: string; amount: Prisma.Decimal | number;
  balanceAfter: Prisma.Decimal | number; note: string | null;
  shipmentId: string | null; createdAt: Date;
}) {
  return {
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    balanceAfter: Number(t.balanceAfter),
    note: t.note,
    shipmentId: t.shipmentId,
    createdAt: t.createdAt.toISOString(),
  };
}
