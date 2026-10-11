/**
 * SEED PROPRE ET REPRODUCTIBLE — Djunoeli
 *
 * Crée les comptes essentiels (idempotent : relançable sans dupliquer).
 * Ne crée AUCUN colis (base vide propre).
 *
 * Lancer :  npx tsx prisma/seed.ts
 *
 * IMPORTANT (Prisma 7 + adapter pg) :
 * Ce projet utilise l'adapter @prisma/adapter-pg. Le PrismaClient DOIT être
 * instancié avec le Pool + PrismaPg comme dans server/src/lib/prisma.ts.
 * On réutilise donc le même pattern ci-dessous. Si ton lib/prisma.ts exporte
 * déjà une instance, tu peux l'importer à la place du bloc d'init.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/* =====================================================
   Comptes à créer (idempotent via upsert sur email)
   ===================================================== */

type SeedUser = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role:
    | "SUPER_ADMIN"
    | "FINANCE_MANAGER"
    | "DISPATCHER"
    | "EXPEDITEUR"
    | "LIVREUR";
};

const USERS: SeedUser[] = [
  { email: "admin@djunoeli.tn", password: "Djunoeli2026", firstName: "Admin", lastName: "Djunoeli", phone: "+216 70 000 000", role: "SUPER_ADMIN" },
  { email: "farah@djunoeli.tn", password: "Farah2026", firstName: "Farah", lastName: "Mansour", phone: "+216 22 333 444", role: "FINANCE_MANAGER" },
  { email: "ali@djunoeli.tn", password: "Ali2026", firstName: "Ali", lastName: "Ben Salah", phone: "+216 22 111 222", role: "DISPATCHER" },
];

// Expéditeurs (créent aussi une ligne Expediteur)
const EXPEDITEURS = [
  { email: "medina@test.tn", password: "Medina2026", firstName: "Sami", lastName: "Medina", phone: "+216 20 100 100", companyName: "Medina Store", pickupAddress: "Rue de la Kasbah 12", pickupCity: "Tunis" },
  { email: "tech@test.tn", password: "TechZone2026", firstName: "Nour", lastName: "TechZone", phone: "+216 20 200 200", companyName: "TechZone", pickupAddress: "Showroom TechZone", pickupCity: "Sfax" },
];

// Livreurs (créent aussi une ligne Livreur)
const LIVREURS = [
  { email: "skander@test.tn", password: "Skander2026", firstName: "Skander", lastName: "Trabelsi", phone: "+216 25 111 111", cin: "12345678", vehicleType: "MOTO", vehiclePlate: "188 TUN 2024" },
  { email: "mohamed@test.tn", password: "Mohamed2026", firstName: "Mohamed", lastName: "Ben Salah", phone: "+216 25 222 222", cin: "98765432", vehicleType: "CAMIONNETTE", vehiclePlate: "210 TUN 2023" },
];

async function main() {
  console.log("🌱 Seed propre Djunoeli...\n");

  // 1. Dépôt Hammamet
  let warehouse = await prisma.warehouse.findFirst({ where: { name: "Dépôt Hammamet" } });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        name: "Dépôt Hammamet", code: "HMT",
        address: "Zone industrielle Hammamet Sud", city: "Hammamet",
        governorate: "Nabeul", country: "TN", phone: "+216 72 100 200", isActive: true,
      },
    });
    console.log(`✅ Dépôt créé : ${warehouse.name}`);
  } else {
    console.log(`ℹ️  Dépôt déjà présent : ${warehouse.name}`);
  }

  // 2. Users simples (admin, finance, dispatcher)
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        firstName: u.firstName, lastName: u.lastName, phone: u.phone,
        role: u.role, status: "ACTIVE", deletedAt: null,
        ...(u.role === "DISPATCHER" ? { warehouseId: warehouse.id } : {}),
      },
      create: {
        email: u.email, passwordHash,
        firstName: u.firstName, lastName: u.lastName, phone: u.phone,
        role: u.role, status: "ACTIVE",
        ...(u.role === "DISPATCHER" ? { warehouseId: warehouse.id } : {}),
      },
    });
    console.log(`✅ ${u.role.padEnd(16)} ${u.email}`);
  }

  // 3. Expéditeurs
  for (const e of EXPEDITEURS) {
    const passwordHash = await bcrypt.hash(e.password, 10);
    const user = await prisma.user.upsert({
      where: { email: e.email },
      update: {
        firstName: e.firstName, lastName: e.lastName, phone: e.phone,
        role: "EXPEDITEUR", status: "ACTIVE", deletedAt: null,
      },
      create: {
        email: e.email, passwordHash,
        firstName: e.firstName, lastName: e.lastName, phone: e.phone,
        role: "EXPEDITEUR", status: "ACTIVE",
      },
    });
    // Ligne Expediteur liée
    const existing = await prisma.expediteur.findFirst({ where: { userId: user.id } });
    if (existing) {
      await prisma.expediteur.update({
        where: { id: existing.id },
        data: { companyName: e.companyName, pickupAddress: e.pickupAddress, pickupCity: e.pickupCity, deletedAt: null },
      });
    } else {
      await prisma.expediteur.create({
        data: {
          userId: user.id, companyName: e.companyName,
          pickupAddress: e.pickupAddress, pickupCity: e.pickupCity,
        },
      });
    }
    console.log(`✅ EXPEDITEUR       ${e.email} (${e.companyName})`);
  }

  // 4. Livreurs
  for (const l of LIVREURS) {
    const passwordHash = await bcrypt.hash(l.password, 10);
    const user = await prisma.user.upsert({
      where: { email: l.email },
      update: {
        firstName: l.firstName, lastName: l.lastName, phone: l.phone,
        role: "LIVREUR", status: "ACTIVE", deletedAt: null,
      },
      create: {
        email: l.email, passwordHash,
        firstName: l.firstName, lastName: l.lastName, phone: l.phone,
        role: "LIVREUR", status: "ACTIVE",
      },
    });
    const existing = await prisma.livreur.findFirst({ where: { userId: user.id } });
    if (existing) {
      await prisma.livreur.update({
        where: { id: existing.id },
        data: {
          cin: l.cin, vehicleType: l.vehicleType as never, vehiclePlate: l.vehiclePlate,
          status: "OFFLINE", codBalance: 0, deletedAt: null,
        },
      });
    } else {
      await prisma.livreur.create({
        data: {
          userId: user.id, cin: l.cin,
          vehicleType: l.vehicleType as never, vehiclePlate: l.vehiclePlate,
          status: "OFFLINE", codBalance: 0,
        },
      });
    }
    console.log(`✅ LIVREUR          ${l.email} (CIN ${l.cin})`);
  }

  console.log("\n🎉 Seed terminé.\n");
  console.log("Comptes :");
  console.log("  Admin      : admin@djunoeli.tn   / Djunoeli2026");
  console.log("  Finance    : farah@djunoeli.tn   / Farah2026");
  console.log("  Dispatcher : ali@djunoeli.tn     / Ali2026");
  console.log("  Expéditeur : medina@test.tn      / Medina2026");
  console.log("  Expéditeur : tech@test.tn        / TechZone2026");
  console.log("  Livreur    : skander@test.tn     / Skander2026");
  console.log("  Livreur    : mohamed@test.tn     / Mohamed2026");
}

main()
  .catch((err) => {
    console.error("❌ Erreur seed :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
