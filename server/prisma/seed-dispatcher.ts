/**
 * Seed du dépôt Hammamet + d'un dispatcher Ali.
 *
 * À exécuter UNE FOIS après la migration :
 *   npx tsx prisma/seed-dispatcher.ts
 *
 * Idempotent : si les enregistrements existent déjà, on ne les recrée pas.
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seed du dépôt Hammamet + dispatcher Ali...\n");

  // 1. Dépôt Hammamet (si pas déjà créé)
  let warehouse = await prisma.warehouse.findFirst({
    where: { name: "Dépôt Hammamet", deletedAt: null },
  });

  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        name: "Dépôt Hammamet",
        code: "HMT",
        address: "Zone industrielle Hammamet Sud",
        city: "Hammamet",
        governorate: "Nabeul",
        country: "TN",
        phone: "+216 72 100 200",
        isActive: true,
      },
    });
    console.log(`✅ Dépôt créé : ${warehouse.name} (id: ${warehouse.id})`);
  } else {
    console.log(`ℹ️  Dépôt déjà existant : ${warehouse.name}`);
  }

  // 2. Dispatcher Ali Ben Salah
  const aliEmail = "ali@djunoeli.tn";
  let ali = await prisma.user.findFirst({
    where: { email: aliEmail, deletedAt: null },
  });

  if (!ali) {
    const passwordHash = await bcrypt.hash("Ali2026", 10);
    ali = await prisma.user.create({
      data: {
        email: aliEmail,
        passwordHash,
        firstName: "Ali",
        lastName: "Ben Salah",
        phone: "+216 22 333 444",
        role: "DISPATCHER",
        status: "ACTIVE",
        warehouseId: warehouse.id,
      },
    });
    console.log(`✅ Dispatcher créé : ${ali.firstName} ${ali.lastName} (${aliEmail})`);
    console.log(`   Mot de passe : Ali2026`);
  } else {
    if (!ali.warehouseId) {
      ali = await prisma.user.update({
        where: { id: ali.id },
        data: { warehouseId: warehouse.id },
      });
      console.log(`✅ Dispatcher Ali rattaché au dépôt Hammamet`);
    } else {
      console.log(`ℹ️  Dispatcher Ali déjà existant et rattaché`);
    }
  }

  console.log("\n🎉 Seed terminé !");
  console.log("\nIdentifiants de test :");
  console.log("  Email    : ali@djunoeli.tn");
  console.log("  Password : Ali2026");
  console.log("  Dépôt    : Hammamet");
}

main()
  .catch((err) => {
    console.error("❌ Erreur seed :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
