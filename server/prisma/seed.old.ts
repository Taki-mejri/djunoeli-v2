import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = "Admin1234!";
  const hash = await bcrypt.hash(password, 10);

  // List existing users
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, status: true } });
  console.log("Existing users:", users);

  // Create super admin if not exists
  const adminEmail = "admin@djunoeli.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        firstName: "Super",
        lastName: "Admin",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
    console.log("Created admin:", admin.email);
  } else {
    console.log("Admin already exists:", existingAdmin.email);
  }

  // Reset passwords for existing livreur accounts
  const livreurEmails = ["skander@test.tn", "mohamed@test.tn"];
  for (const email of livreurEmails) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash },
    });
    console.log(`Reset password for ${email} → Admin1234!`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
