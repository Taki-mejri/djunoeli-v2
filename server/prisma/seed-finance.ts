/**
 * Seed d'un compte finance Farah.
 *
 * À exécuter UNE FOIS :
 *   npx tsx prisma/seed-finance.ts
 *
 * Idempotent : si le compte existe déjà, on ne le recrée pas.
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
  console.log("🌱 Seed du compte finance Farah...\n");

  const email = "farah@djunoeli.tn";
  let farah = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });

  if (!farah) {
    const passwordHash = await bcrypt.hash("Farah2026", 10);
    farah = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: "Farah",
        lastName: "Trabelsi",
        phone: "+216 24 555 666",
        role: "FINANCE_MANAGER",
        status: "ACTIVE",
      },
    });
    console.log(`✅ Compte finance créé : ${farah.firstName} ${farah.lastName} (${email})`);
    console.log(`   Mot de passe : Farah2026`);
  } else {
    console.log(`ℹ️  Compte finance déjà existant : ${email}`);
  }

  console.log("\n🎉 Seed terminé !");
  console.log("\nIdentifiants de test :");
  console.log("  Email    : farah@djunoeli.tn");
  console.log("  Password : Farah2026");
}

main()
  .catch((err) => {
    console.error("❌ Erreur seed :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
