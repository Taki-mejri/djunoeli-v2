/**
 * Prérequis du test i18n Finance — rend la suite REJOUABLE.
 *
 * Le scénario e) encaisse réellement un livreur et f) génère puis paie une
 * facture : la base est mutée, donc un second passage trouverait un espace
 * vide (« Kein einzusammelnder Saldo ») et ne pourrait plus ouvrir la modale.
 *
 * Ce script remet l'état de départ AVANT chaque exécution :
 *   - supprime les reversements créés par le test (référence BELEG-DE-*)
 *   - restaure le solde COD du livreur de test
 *   - supprime les factures créées par le test et remet leurs colis à facturer
 *
 * Usage : node prep-finance-fixtures.js   (appelé automatiquement par le test)
 */

const path = require("path");
const SERVER = "C:/Users/taki/Desktop/livraison/server";
require(path.join(SERVER, "node_modules/dotenv")).config({ path: path.join(SERVER, ".env") });

const { Pool } = require(path.join(SERVER, "node_modules/pg"));
const { PrismaPg } = require(path.join(SERVER, "node_modules/@prisma/adapter-pg"));
const { PrismaClient } = require(path.join(SERVER, "node_modules/@prisma/client"));

const TARGET_BALANCE = 60;
const REF_PREFIX = "BELEG-DE-";

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  // 1) reversements livreur créés par le test → suppression + solde restauré
  const settlements = await prisma.livreurCodSettlement.findMany({
    where: { reference: { startsWith: REF_PREFIX } },
    select: { id: true, amount: true, livreurId: true },
  });
  for (const s of settlements) {
    await prisma.livreur.update({
      where: { id: s.livreurId },
      data: { codBalance: { increment: s.amount } },
    });
  }
  if (settlements.length) {
    await prisma.livreurCodSettlement.deleteMany({ where: { reference: { startsWith: REF_PREFIX } } });
  }

  // 2) garantir qu'au moins un livreur a un solde à encaisser
  let withBalance = await prisma.livreur.findFirst({
    where: { codBalance: { gt: 0 } },
    select: { id: true, codBalance: true },
  });
  if (!withBalance) {
    const any = await prisma.livreur.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!any) throw new Error("aucun livreur en base : lancer le seed d'abord");
    withBalance = await prisma.livreur.update({
      where: { id: any.id },
      data: { codBalance: TARGET_BALANCE },
      select: { id: true, codBalance: true },
    });
  }

  // 3) factures créées par le test : on les supprime et on « défacture » leurs
  //    colis (Shipment.invoiceId = null) pour que la génération soit rejouable
  const testInvoices = await prisma.invoice.findMany({
    where: { shipments: { some: {} }, payments: { none: { reference: { not: null } } } },
    select: { id: true, number: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const cutoff = new Date(Date.now() - 6 * 3600 * 1000); // créées pendant la session de test
  const recent = testInvoices.filter((i) => i.createdAt > cutoff);
  let unbilled = 0;
  for (const inv of recent) {
    const r = await prisma.shipment.updateMany({ where: { invoiceId: inv.id }, data: { invoiceId: null } });
    unbilled += r.count;
    await prisma.payment.deleteMany({ where: { invoiceId: inv.id } });
    await prisma.invoice.delete({ where: { id: inv.id } });
  }

  console.log(
    `[prep] reversements de test supprimés : ${settlements.length} · ` +
    `livreur ${withBalance.id} solde = ${Number(withBalance.codBalance)} DT · ` +
    `factures de test supprimees : ${recent.length} (${unbilled} colis defactures)`
  );

  await prisma.$disconnect();
  await pool.end();
})().catch((e) => {
  console.error("[prep] échec :", e.message);
  process.exit(1);
});
