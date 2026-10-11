/**
 * NETTOYAGE — vide les données transactionnelles.
 *
 * Supprime : colis, historiques de statut, reversements (livreur + expéditeur),
 * factures, et remet les soldes COD des livreurs à 0 + statut OFFLINE.
 *
 * GARDE : les comptes (users, expéditeurs, livreurs, dépôt).
 *
 * À lancer AVANT le seed si tu veux repartir propre :
 *   npx tsx prisma/reset-clean.ts
 *   npx tsx prisma/seed.ts
 *
 * Prisma 7 + adapter pg : même pattern d'init que seed.ts.
 *
 * ⚠️ ADAPTE LES NOMS DE MODÈLES : ce script suppose certains noms
 * (LivreurCodSettlement, CodSettlement, Invoice, ShipmentStatusHistory,
 * Shipment). Vérifie qu'ils matchent ton schema.prisma. Retire/renomme
 * les deleteMany selon les modèles réellement présents.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function safeDelete(label: string, fn: () => Promise<{ count: number }>) {
  try {
    const { count } = await fn();
    console.log(`  🗑️  ${label.padEnd(28)} ${count} supprimé(s)`);
  } catch (err) {
    console.log(`  ⚠️  ${label.padEnd(28)} ignoré (modèle absent ou nom différent)`);
  }
}

async function main() {
  console.log("🧹 Nettoyage des données transactionnelles...\n");

  // Ordre important : d'abord les tables qui référencent Shipment.

  // Historiques de statut
  await safeDelete("ShipmentStatusHistory", () =>
    prisma.shipmentStatusHistory.deleteMany({})
  );

  // Reversements livreur (modèle dédié créé plus tôt)
  await safeDelete("LivreurCodSettlement", () =>
    (prisma as unknown as { livreurCodSettlement: { deleteMany: (a: unknown) => Promise<{ count: number }> } })
      .livreurCodSettlement.deleteMany({})
  );

  // Reversements expéditeur (CodSettlement original)
  await safeDelete("CodSettlement", () =>
    prisma.codSettlement.deleteMany({})
  );

  // Collections COD éventuelles
  await safeDelete("CodCollection", () =>
    (prisma as unknown as { codCollection: { deleteMany: (a: unknown) => Promise<{ count: number }> } })
      .codCollection.deleteMany({})
  );

  // Paiements de factures éventuels
  await safeDelete("Payment", () =>
    (prisma as unknown as { payment: { deleteMany: (a: unknown) => Promise<{ count: number }> } })
      .payment.deleteMany({})
  );

  // Factures
  await safeDelete("Invoice", () => prisma.invoice.deleteMany({}));

  // Notifications / tickets éventuels liés aux colis
  await safeDelete("Notification", () =>
    (prisma as unknown as { notification: { deleteMany: (a: unknown) => Promise<{ count: number }> } })
      .notification.deleteMany({})
  );

  // Enfin, les colis
  await safeDelete("Shipment", () => prisma.shipment.deleteMany({}));

  // Remettre les livreurs à zéro (solde COD + statut)
  try {
    const updated = await prisma.livreur.updateMany({
      data: { codBalance: 0, status: "OFFLINE" },
    });
    console.log(`\n  ♻️  Livreurs réinitialisés          ${updated.count} (codBalance=0, OFFLINE)`);
  } catch {
    console.log("  ⚠️  Réinit livreurs ignorée (champ codBalance/status différent ?)");
  }

  console.log("\n✅ Nettoyage terminé. Lance ensuite : npx tsx prisma/seed.ts\n");
}

main()
  .catch((err) => {
    console.error("❌ Erreur nettoyage :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
