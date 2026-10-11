import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { conflict, notFound } from "../middleware/errorHandler.js";
import { makePaginated, parseSort, type Paginated } from "../lib/pagination.js";
import type {
  CreateLivreurInput,
  UpdateLivreurInput,
  ListLivreursFilters,
  LivreurSelfStatusInput,
} from "../schemas/livreur.schema.js";

/* =====================================================
   Champs publics — JAMAIS de passwordHash
   ===================================================== */

const livreurSelect = {
  id: true,
  cin: true,
  vehicleType: true,
  vehiclePlate: true,
  zoneId: true,
  status: true, // LivreurStatus (AVAILABLE/BUSY/OFFLINE)
  rating: true,
  totalDeliveries: true,
  successRate: true,
  codBalance: true,
  currentLat: true,
  currentLng: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true, // UserStatus
      lastLoginAt: true,
    },
  },
  zone: { select: { id: true, name: true } },
} satisfies Prisma.LivreurSelect;

export type LivreurPublic = Prisma.LivreurGetPayload<{ select: typeof livreurSelect }>;

/* =====================================================
   LIST
   ===================================================== */

export async function listLivreurs(
  pagination: { page: number; pageSize: number; search?: string; sort?: string },
  filters: ListLivreursFilters
): Promise<Paginated<LivreurPublic>> {
  const { page, pageSize, search, sort } = pagination;
  const skip = (page - 1) * pageSize;

  const where: Prisma.LivreurWhereInput = {
    deletedAt: null,
    ...(filters.livreurStatus ? { status: filters.livreurStatus } : {}),
    ...(filters.vehicleType ? { vehicleType: filters.vehicleType } : {}),
    ...(filters.zoneId ? { zoneId: filters.zoneId } : {}),
    ...(filters.status ? { user: { status: filters.status } } : {}),
    ...(search
      ? {
          OR: [
            { user: { firstName: { contains: search, mode: "insensitive" } } },
            { user: { lastName: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            { user: { phone: { contains: search, mode: "insensitive" } } },
            { vehiclePlate: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy = parseSort(sort, ["createdAt", "totalDeliveries", "rating", "updatedAt"]);

  const [data, total] = await Promise.all([
    prisma.livreur.findMany({
      where,
      select: livreurSelect,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.livreur.count({ where }),
  ]);

  return makePaginated(data, total, page, pageSize);
}

/* =====================================================
   GET ONE
   ===================================================== */

export async function getLivreurById(id: string): Promise<LivreurPublic> {
  const liv = await prisma.livreur.findFirst({
    where: { id, deletedAt: null },
    select: livreurSelect,
  });
  if (!liv) throw notFound("Livreur introuvable");
  return liv;
}

export async function getLivreurByUserId(userId: string): Promise<LivreurPublic> {
  const liv = await prisma.livreur.findFirst({
    where: { userId, deletedAt: null },
    select: livreurSelect,
  });
  if (!liv) throw notFound("Profil livreur introuvable");
  return liv;
}

/* =====================================================
   CREATE — User + Livreur en transaction
   ===================================================== */

export async function createLivreur(input: CreateLivreurInput): Promise<LivreurPublic> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("Cet email est déjà utilisé");

  if (input.cin) {
    const cinExists = await prisma.livreur.findUnique({ where: { cin: input.cin } });
    if (cinExists) throw conflict("Cette CIN est déjà enregistrée");
  }

  const passwordHash = await hashPassword(input.password);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: "LIVREUR",
        status: "ACTIVE",
      },
    });

    const livreur = await tx.livreur.create({
      data: {
        userId: user.id,
        cin: input.cin,
        vehicleType: input.vehicleType,
        vehiclePlate: input.vehiclePlate,
        zoneId: input.zoneId,
        status: "OFFLINE", // par défaut, le livreur est hors-ligne tant qu'il ne s'est pas connecté
      },
      select: livreurSelect,
    });

    return livreur;
  });

  return created;
}

/* =====================================================
   UPDATE
   ===================================================== */

export async function updateLivreur(id: string, input: UpdateLivreurInput): Promise<LivreurPublic> {
  const current = await prisma.livreur.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, userId: true, cin: true },
  });
  if (!current) throw notFound("Livreur introuvable");

  // Vérifier unicité du CIN si changé
  if (input.cin && input.cin !== current.cin) {
    const dup = await prisma.livreur.findUnique({ where: { cin: input.cin } });
    if (dup) throw conflict("Cette CIN est déjà enregistrée");
  }

  // Séparer champs User / Livreur
  const { firstName, lastName, phone, status, livreurStatus, ...rest } = input;
  const userFields = { firstName, lastName, phone, status };
  const hasUserChanges =
    firstName !== undefined ||
    lastName !== undefined ||
    phone !== undefined ||
    status !== undefined;

  const livreurFields = { ...rest, ...(livreurStatus !== undefined ? { status: livreurStatus } : {}) };

  await prisma.$transaction(async (tx) => {
    if (hasUserChanges) {
      await tx.user.update({
        where: { id: current.userId },
        data: Object.fromEntries(Object.entries(userFields).filter(([, v]) => v !== undefined)),
      });
    }
    if (Object.keys(livreurFields).length > 0) {
      await tx.livreur.update({ where: { id }, data: livreurFields });
    }
  });

  return getLivreurById(id);
}

/* =====================================================
   DELETE — soft delete + révocation tokens
   ===================================================== */

export async function deleteLivreur(id: string): Promise<void> {
  const current = await prisma.livreur.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!current) throw notFound("Livreur introuvable");

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.livreur.update({ where: { id }, data: { deletedAt: now, status: "OFFLINE" } });
    await tx.user.update({
      where: { id: current.userId },
      data: { status: "SUSPENDED", deletedAt: now },
    });
    await tx.refreshToken.updateMany({
      where: { userId: current.userId, revoked: false },
      data: { revoked: true },
    });
  });
}

/* =====================================================
   SELF — le livreur change SA propre dispo
   ===================================================== */

export async function setLivreurSelfStatus(
  userId: string,
  input: LivreurSelfStatusInput
): Promise<LivreurPublic> {
  const liv = await prisma.livreur.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!liv) throw notFound("Profil livreur introuvable");

  await prisma.livreur.update({
    where: { id: liv.id },
    data: { status: input.status, lastSeenAt: new Date() },
  });

  return getLivreurById(liv.id);
}
