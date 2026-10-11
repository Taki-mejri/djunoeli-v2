import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getPriceBreakdown } from "../lib/pricing.js";
import { buildTrackingNumber } from "../lib/tracking.js";
import { badRequest, notFound, forbidden } from "../middleware/errorHandler.js";
import { makePaginated, parseSort, type Paginated } from "../lib/pagination.js";
import type {
  EstimateInput,
  CreateShipmentInput,
  CancelShipmentInput,
  ListShipmentFilters,
} from "../schemas/shipment.schema.js";

/* =====================================================
   Select — liste (sans historique pour la perf)
   ===================================================== */
const shipmentListSelect = {
  id: true,
  trackingNumber: true,
  status: true,
  deliveryType: true,
  deliveryPrice: true,
  codAmount: true,
  isFragile: true,
  receiverName: true,
  receiverPhone: true,
  deliveryAddress: true,
  deliveryCity: true,
  senderName: true,
  pickupAddress: true,
  pickupCity: true,
  description: true,
  expediteurId: true,
  livreurId: true,
  createdAt: true,
  updatedAt: true,
  expediteur: {
    select: {
      id: true,
      companyName: true,
      user: { select: { email: true, phone: true } },
    },
  },
} satisfies Prisma.ShipmentSelect;

/* =====================================================
   Select — détail (avec historique)
   ===================================================== */
const shipmentDetailSelect = {
  ...shipmentListSelect,
  senderPhone: true,
  receiverEmail: true,
  dimensions: true,
  weight: true,
  insuranceFee: true,
  statusReason: true,
  pickedUpAt: true,
  deliveredAt: true,
  expectedDeliveryDate: true,
  statusHistory: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      status: true,
      note: true,
      location: true,
      createdAt: true,
    },
  },
  expediteur: {
    select: {
      id: true,
      companyName: true,
      user: { select: { email: true, phone: true } },
    },
  },
} satisfies Prisma.ShipmentSelect;

export type ShipmentList = Prisma.ShipmentGetPayload<{ select: typeof shipmentListSelect }>;
export type ShipmentDetail = Prisma.ShipmentGetPayload<{ select: typeof shipmentDetailSelect }>;

/* =====================================================
   ESTIMATE — calcule le prix sans créer de colis
   ===================================================== */
export function estimatePrice(input: EstimateInput) {
  return getPriceBreakdown(input.deliveryType, input.isFragile);
}

/* =====================================================
   LIST — avec pagination, filtres, scope optionnel
   ===================================================== */
export async function listShipments(
  pagination: { page: number; pageSize: number; search?: string; sort?: string },
  filters: ListShipmentFilters,
  scopeUserId?: string
): Promise<Paginated<ShipmentList>> {
  const { page, pageSize, search, sort } = pagination;
  const skip = (page - 1) * pageSize;

  // Résoudre le userId en expediteurId pour le scope expéditeur
  let scopeExpediteurId: string | undefined;
  if (scopeUserId) {
    const exp = await prisma.expediteur.findFirst({
      where: { userId: scopeUserId, deletedAt: null },
      select: { id: true },
    });
    if (!exp) throw notFound("Profil expéditeur introuvable");
    scopeExpediteurId = exp.id;
  }

  const where: Prisma.ShipmentWhereInput = {
    deletedAt: null,
    ...(scopeExpediteurId ? { expediteurId: scopeExpediteurId } : {}),
    ...(filters.expediteurId ? { expediteurId: filters.expediteurId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.deliveryType ? { deliveryType: filters.deliveryType } : {}),
    ...(filters.city ? { deliveryCity: { contains: filters.city, mode: "insensitive" } } : {}),
    ...(search
      ? {
          OR: [
            { trackingNumber: { contains: search, mode: "insensitive" } },
            { receiverName: { contains: search, mode: "insensitive" } },
            { receiverPhone: { contains: search, mode: "insensitive" } },
            { deliveryCity: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy = parseSort(sort, ["createdAt", "updatedAt", "deliveryPrice"]);

  const [data, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      select: shipmentListSelect,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.shipment.count({ where }),
  ]);

  return makePaginated(data, total, page, pageSize);
}

/* =====================================================
   GET ONE — avec historique de statuts
   ===================================================== */
export async function getShipmentById(id: string): Promise<ShipmentDetail> {
  const shipment = await prisma.shipment.findFirst({
    where: { id, deletedAt: null },
    select: shipmentDetailSelect,
  });
  if (!shipment) throw notFound("Colis introuvable");
  return shipment;
}

/* Idem mais scope-isolé : n'expose que les colis de cet expéditeur */
export async function getMyShipment(id: string, expediteurUserId: string): Promise<ShipmentDetail> {
  const exp = await prisma.expediteur.findFirst({
    where: { userId: expediteurUserId, deletedAt: null },
    select: { id: true },
  });
  if (!exp) throw notFound("Profil expéditeur introuvable");

  const shipment = await prisma.shipment.findFirst({
    where: { id, expediteurId: exp.id, deletedAt: null },
    select: shipmentDetailSelect,
  });
  if (!shipment) throw notFound("Colis introuvable");
  return shipment;
}

/* =====================================================
   CREATE — crée le colis + 1ère entrée dans l'historique
   ===================================================== */
export async function createShipment(
  expediteurUserId: string,
  input: CreateShipmentInput
): Promise<ShipmentDetail> {
  // Récupère le profil expéditeur (snapshot des infos d'envoi)
  const expediteur = await prisma.expediteur.findFirst({
    where: { userId: expediteurUserId, deletedAt: null },
    select: {
      id: true,
      companyName: true,
      pickupAddress: true,
      pickupCity: true,
      pickupLat: true,
      pickupLng: true,
      user: { select: { id: true, phone: true } },
    },
  });
  if (!expediteur) throw notFound("Profil expéditeur introuvable");
  const pickupAddress = expediteur.pickupAddress;
  const pickupCity = expediteur.pickupCity;
  if (!pickupAddress || !pickupCity) {
    throw badRequest(
      "Veuillez configurer votre adresse de ramassage avant de créer un colis"
    );
  }

  const { total } = getPriceBreakdown(input.deliveryType, input.isFragile);

  const createdId = await prisma.$transaction(async (tx) => {
    const count = await tx.shipment.count();
    const trackingNumber = buildTrackingNumber(count + 1);

    const created = await tx.shipment.create({
      data: {
        trackingNumber,
        expediteurId: expediteur.id,
        // Snapshot expéditeur
        senderName: expediteur.companyName,
        senderPhone: expediteur.user.phone ?? "",
        pickupAddress,
        pickupCity,
        pickupLat: expediteur.pickupLat ?? undefined,
        pickupLng: expediteur.pickupLng ?? undefined,
        // Destinataire
        receiverName: input.receiverName,
        receiverPhone: input.receiverPhone,
        receiverEmail: input.receiverEmail,
        deliveryAddress: input.deliveryAddress,
        deliveryCity: input.deliveryCity,
        // Colis
        deliveryType: input.deliveryType,
        isFragile: input.isFragile,
        weight: 0,
        description: input.description,
        // Prix
        deliveryPrice: total,
        codAmount: input.codAmount,
        // Statut initial
        status: "PENDING",
        statusHistory: {
          create: {
            status: "PENDING",
            note: "Colis créé",
            changedById: expediteur.user.id,
          },
        },
      },
      select: { id: true },
    });

    return created.id;
  });

  return getShipmentById(createdId);
}

/* =====================================================
   CANCEL — annulation par l'expéditeur (PENDING uniquement)
   ===================================================== */
export async function cancelShipment(
  shipmentId: string,
  expediteurUserId: string,
  input: CancelShipmentInput
): Promise<ShipmentDetail> {
  // Récupère le colis et vérifie qu'il appartient à cet expéditeur
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, deletedAt: null },
    select: {
      id: true,
      status: true,
      expediteur: { select: { userId: true } },
    },
  });
  if (!shipment) throw notFound("Colis introuvable");
  if (shipment.expediteur.userId !== expediteurUserId) {
    throw forbidden("Ce colis ne vous appartient pas");
  }
  if (shipment.status !== "PENDING") {
    throw badRequest(`Impossible d'annuler un colis en statut ${shipment.status}`);
  }

  // Récupère l'userId de l'expéditeur pour le changedById
  const expediteur = await prisma.expediteur.findFirst({
    where: { userId: expediteurUserId },
    select: { user: { select: { id: true } } },
  });

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: "CANCELLED", statusReason: input.reason },
    });
    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId,
        status: "CANCELLED",
        note: input.reason,
        changedById: expediteur?.user.id,
      },
    });
  });

  return getShipmentById(shipmentId);
}
