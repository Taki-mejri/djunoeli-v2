import { prisma } from "../lib/prisma.js";

/* =====================================================
   RAPPORTS FINANCIERS — vue d'ensemble
   ===================================================== */

export async function getFinancialOverview() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    deliveredShipments,
    monthDelivered,
    livreurBalances,
    unsettledExpediteurCod,
    invoicesUnpaid,
    invoicesPaid,
  ] = await Promise.all([
    // CA total = somme des frais de livraison sur colis livrés
    prisma.shipment.aggregate({
      where: { status: "DELIVERED", deletedAt: null },
      _sum: { deliveryPrice: true },
      _count: { _all: true },
    }),
    // CA du mois
    prisma.shipment.aggregate({
      where: { status: "DELIVERED", deletedAt: null, deliveredAt: { gte: startOfMonth } },
      _sum: { deliveryPrice: true },
      _count: { _all: true },
    }),
    // Cash détenu par les livreurs (COD pas encore reversé à la boîte)
    prisma.livreur.aggregate({
      where: { deletedAt: null },
      _sum: { codBalance: true },
    }),
    // COD livré mais pas encore reversé aux expéditeurs (net)
    prisma.shipment.findMany({
      where: {
        status: "DELIVERED",
        deletedAt: null,
        expediteurCodSettledAt: null,
        codAmount: { gt: 0 },
      },
      select: { codAmount: true, deliveryPrice: true },
    }),
    // Factures impayées
    prisma.invoice.aggregate({
      where: { status: "UNPAID" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    // Factures payées ce mois
    prisma.invoice.aggregate({
      where: { status: "PAID", paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const expediteurCodGross = unsettledExpediteurCod.reduce((s, x) => s + Number(x.codAmount), 0);
  const expediteurCodCommission = unsettledExpediteurCod.reduce((s, x) => s + Number(x.deliveryPrice), 0);
  const expediteurCodNet = expediteurCodGross - expediteurCodCommission;

  return {
    revenue: {
      total: Number(deliveredShipments._sum.deliveryPrice ?? 0),
      totalDeliveries: deliveredShipments._count._all,
      thisMonth: Number(monthDelivered._sum.deliveryPrice ?? 0),
      thisMonthDeliveries: monthDelivered._count._all,
    },
    cashPosition: {
      // Cash chez les livreurs (à récupérer)
      heldByLivreurs: Number(livreurBalances._sum.codBalance ?? 0),
      // COD à reverser aux expéditeurs (net)
      owedToExpediteurs: expediteurCodNet,
      // Commission "gagnée" sur le COD non encore soldé
      pendingCommission: expediteurCodCommission,
    },
    invoicing: {
      unpaidAmount: Number(invoicesUnpaid._sum.amount ?? 0),
      unpaidCount: invoicesUnpaid._count._all,
      paidThisMonth: Number(invoicesPaid._sum.amount ?? 0),
      paidThisMonthCount: invoicesPaid._count._all,
    },
  };
}

/* =====================================================
   Répartition des colis par statut (pour un graphe)
   ===================================================== */

export async function getShipmentStatusBreakdown() {
  const grouped = await prisma.shipment.groupBy({
    by: ["status"],
    where: { deletedAt: null },
    _count: { _all: true },
  });

  return grouped.map((g) => ({
    status: g.status,
    count: g._count._all,
  }));
}
