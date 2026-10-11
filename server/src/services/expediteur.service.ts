import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { conflict, notFound } from "../middleware/errorHandler.js";
import { makePaginated, parseSort, type Paginated } from "../lib/pagination.js";
import type {
  CreateExpediteurInput,
  UpdateExpediteurInput,
  ListExpediteursFilters,
} from "../schemas/expediteur.schema.js";

/* =====================================================
   Champs publics — JAMAIS de passwordHash dans une réponse
   ===================================================== */

const expediteurSelect = {
  id: true,
  companyName: true,
  contactPerson: true,
  taxNumber: true,
  businessAddress: true,
  city: true,
  postalCode: true,
  pickupAddress: true,
  pickupCity: true,
  pickupLat: true,
  pickupLng: true,
  balance: true,
  creditLimit: true,
  pricingPlanId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      phone: true,
      status: true,
      lastLoginAt: true,
    },
  },
} satisfies Prisma.ExpediteurSelect;

export type ExpediteurPublic = Prisma.ExpediteurGetPayload<{
  select: typeof expediteurSelect;
}>;

/* =====================================================
   LIST — pagination + recherche + filtres
   ===================================================== */

export async function listExpediteurs(
  pagination: { page: number; pageSize: number; search?: string; sort?: string },
  filters: ListExpediteursFilters
): Promise<Paginated<ExpediteurPublic>> {
  const { page, pageSize, search, sort } = pagination;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ExpediteurWhereInput = {
    deletedAt: null,
    ...(filters.city ? { city: { equals: filters.city, mode: "insensitive" } } : {}),
    ...(filters.status ? { user: { status: filters.status } } : {}),
    ...(search
      ? {
          OR: [
            { companyName: { contains: search, mode: "insensitive" } },
            { contactPerson: { contains: search, mode: "insensitive" } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            { user: { phone: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy = parseSort(sort, ["createdAt", "companyName", "updatedAt"]);

  const [data, total] = await Promise.all([
    prisma.expediteur.findMany({
      where,
      select: expediteurSelect,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.expediteur.count({ where }),
  ]);

  return makePaginated(data, total, page, pageSize);
}

/* =====================================================
   GET ONE
   ===================================================== */

export async function getExpediteurById(id: string): Promise<ExpediteurPublic> {
  const exp = await prisma.expediteur.findFirst({
    where: { id, deletedAt: null },
    select: expediteurSelect,
  });
  if (!exp) throw notFound("Expéditeur introuvable");
  return exp;
}

/** Pour un expéditeur connecté, récupère son propre profil via son userId */
export async function getExpediteurByUserId(userId: string): Promise<ExpediteurPublic> {
  const exp = await prisma.expediteur.findFirst({
    where: { userId, deletedAt: null },
    select: expediteurSelect,
  });
  if (!exp) throw notFound("Profil expéditeur introuvable");
  return exp;
}

/* =====================================================
   CREATE — crée User + Expediteur en une transaction atomique
   ===================================================== */

export async function createExpediteur(
  input: CreateExpediteurInput
): Promise<ExpediteurPublic> {
  // Vérifier l'unicité de l'email AVANT la transaction (UX claire)
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("Cet email est déjà utilisé");

  const passwordHash = await hashPassword(input.password);

  // Transaction : si une partie échoue, rien n'est créé
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        phone: input.phone,
        role: "EXPEDITEUR",
        status: "ACTIVE",
      },
    });

    const expediteur = await tx.expediteur.create({
      data: {
        userId: user.id,
        companyName: input.companyName,
        contactPerson: input.contactPerson,
        taxNumber: input.taxNumber,
        businessAddress: input.businessAddress,
        city: input.city,
        postalCode: input.postalCode,
        pickupAddress: input.pickupAddress,
        pickupCity: input.pickupCity,
        pickupLat: input.pickupLat,
        pickupLng: input.pickupLng,
        creditLimit: input.creditLimit,
        pricingPlanId: input.pricingPlanId,
      },
      select: expediteurSelect,
    });

    return expediteur;
  });

  return created;
}

/* =====================================================
   UPDATE — met à jour User et/ou Expediteur
   ===================================================== */

export async function updateExpediteur(
  id: string,
  input: UpdateExpediteurInput
): Promise<ExpediteurPublic> {
  // Vérifie d'abord que l'expéditeur existe (et n'est pas soft-deleted)
  const current = await prisma.expediteur.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!current) throw notFound("Expéditeur introuvable");

  // Sépare les champs User des champs Expediteur
  const { phone, status, ...expediteurFields } = input;
  const hasUserChanges = phone !== undefined || status !== undefined;

  await prisma.$transaction(async (tx) => {
    if (hasUserChanges) {
      await tx.user.update({
        where: { id: current.userId },
        data: {
          ...(phone !== undefined ? { phone } : {}),
          ...(status !== undefined ? { status } : {}),
        },
      });
    }
    if (Object.keys(expediteurFields).length > 0) {
      await tx.expediteur.update({
        where: { id },
        data: expediteurFields,
      });
    }
  });

  return getExpediteurById(id);
}

/* =====================================================
   DELETE — soft delete (deletedAt) sur Expediteur + suspend le User
   ===================================================== */

export async function deleteExpediteur(id: string): Promise<void> {
  const current = await prisma.expediteur.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!current) throw notFound("Expéditeur introuvable");

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.expediteur.update({
      where: { id },
      data: { deletedAt: now },
    });
    // On suspend le User et on révoque ses tokens (sécurité)
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
