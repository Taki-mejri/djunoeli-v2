import { InvoiceStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { notFound, badRequest } from "../middleware/errorHandler.js";
import { formatEUR } from "../lib/money.js";

const INVOICE_STATUSES = new Set<string>(Object.values(InvoiceStatus));
function isInvoiceStatus(value: string): value is InvoiceStatus {
  return INVOICE_STATUSES.has(value);
}

/* =====================================================
   FACTURES — frais de livraison des colis SANS COD
   (les colis COD ont déjà eu leur commission déduite du reversement)
   ===================================================== */

/** Génère le numéro de facture INV-2026-NNNNN */
async function generateInvoiceNumber(tx: {
  invoice: { count: (args: unknown) => Promise<number> };
}): Promise<string> {
  const year = new Date().getFullYear();
  // Compte les factures de l'année pour le prochain numéro
  const count = await (tx.invoice.count as (a: unknown) => Promise<number>)({
    where: { number: { startsWith: `INV-${year}-` } },
  });
  const seq = String(count + 1).padStart(5, "0");
  return `INV-${year}-${seq}`;
}

/* =====================================================
   Aperçu : ce qui est facturable pour un expéditeur
   ===================================================== */

export async function getInvoiceableForExpediteur(expediteurId: string) {
  const shipments = await prisma.shipment.findMany({
    where: {
      expediteurId,
      status: "DELIVERED",
      deletedAt: null,
      invoiceId: null,
      codAmount: { lte: 0 }, // sans COD (les COD ont déjà déduit la commission)
    },
    select: { id: true, trackingNumber: true, deliveryPrice: true, deliveredAt: true, deliveryCity: true },
  });

  const total = shipments.reduce((sum, s) => sum + Number(s.deliveryPrice), 0);
  return { shipments, total, count: shipments.length };
}

/* =====================================================
   Générer une facture
   ===================================================== */

type GenInvoiceInput = {
  actorUserId: string;
  expediteurId: string;
  periodStart?: string;
  periodEnd?: string;
  note?: string;
};

export async function generateInvoice(input: GenInvoiceInput) {
  const expediteur = await prisma.expediteur.findFirst({
    where: { id: input.expediteurId, deletedAt: null },
    select: { id: true, companyName: true },
  });
  if (!expediteur) throw notFound("Expéditeur introuvable");

  const whereShipments = {
    expediteurId: input.expediteurId,
    status: "DELIVERED" as const,
    deletedAt: null,
    invoiceId: null,
    codAmount: { lte: 0 },
    ...(input.periodStart || input.periodEnd
      ? {
          deliveredAt: {
            ...(input.periodStart ? { gte: new Date(input.periodStart) } : {}),
            ...(input.periodEnd ? { lte: new Date(input.periodEnd) } : {}),
          },
        }
      : {}),
  };

  const shipments = await prisma.shipment.findMany({
    where: whereShipments,
    select: { id: true, deliveryPrice: true },
  });

  if (shipments.length === 0) {
    throw badRequest("Aucun colis facturable pour cet expéditeur sur cette période.");
  }

  const amount = shipments.reduce((sum, s) => sum + Number(s.deliveryPrice), 0);

  const result = await prisma.$transaction(async (tx) => {
    const number = await generateInvoiceNumber(tx as never);

    const invoice = await tx.invoice.create({
      data: {
        expediteurId: input.expediteurId,
        number,
        amount,
        status: "UNPAID",
        periodStart: input.periodStart ? new Date(input.periodStart) : null,
        periodEnd: input.periodEnd ? new Date(input.periodEnd) : null,
        note: input.note,
        createdById: input.actorUserId,
      },
      select: { id: true, number: true, amount: true, status: true, createdAt: true },
    });

    // Lier les colis à la facture
    await tx.shipment.updateMany({
      where: { id: { in: shipments.map((s) => s.id) } },
      data: { invoiceId: invoice.id },
    });

    return invoice;
  });

  return {
    invoice: result,
    companyName: expediteur.companyName,
    shipmentCount: shipments.length,
    message: `Facture ${result.number} créée : ${formatEUR(amount)} (${shipments.length} colis).`,
  };
}

/* =====================================================
   Liste des factures
   ===================================================== */

export async function listInvoices(filters: { status?: string; expediteurId?: string }) {
  const statusFilter = filters.status && isInvoiceStatus(filters.status) ? filters.status : undefined;
  const invoices = await prisma.invoice.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(filters.expediteurId ? { expediteurId: filters.expediteurId } : {}),
    },
    select: {
      id: true,
      number: true,
      amount: true,
      status: true,
      periodStart: true,
      periodEnd: true,
      paidAt: true,
      createdAt: true,
      expediteur: { select: { companyName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return invoices.map((i) => ({
    id: i.id,
    number: i.number,
    amount: Number(i.amount),
    status: i.status,
    periodStart: i.periodStart?.toISOString() ?? null,
    periodEnd: i.periodEnd?.toISOString() ?? null,
    paidAt: i.paidAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
    companyName: i.expediteur?.companyName ?? "—",
  }));
}

/* =====================================================
   Marquer une facture payée
   ===================================================== */

export async function payInvoice(
  invoiceId: string,
  method?: "CASH" | "BANK_TRANSFER" | "CHECK",
  reference?: string
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId },
    select: { id: true, status: true, number: true, amount: true },
  });
  if (!invoice) throw notFound("Facture introuvable");
  if (invoice.status === "PAID") {
    throw badRequest("Cette facture est déjà payée.");
  }
  if (invoice.status === "CANCELLED") {
    throw badRequest("Cette facture est annulée.");
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      ...(method ? { paymentMethod: method } : {}),
      ...(reference ? { paymentReference: reference } : {}),
    },
    select: { id: true, number: true, amount: true, status: true, paidAt: true },
  });

  return {
    invoice: updated,
    message: `Facture ${invoice.number} marquée payée (${formatEUR(Number(invoice.amount))}).`,
  };
}
