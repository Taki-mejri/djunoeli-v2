import { z } from "zod";
import { ShipmentStatus, DeliveryType } from "@prisma/client";

export const estimateSchema = z.object({
  deliveryType: z.nativeEnum(DeliveryType),
  isFragile: z.boolean().default(false),
});

export type EstimateInput = z.infer<typeof estimateSchema>;

export const createShipmentSchema = z.object({
  receiverName: z.string().min(2, "Nom du destinataire trop court").max(120),
  receiverPhone: z.string().regex(/^\+?[0-9\s-]{7,20}$/, "Téléphone invalide"),
  receiverEmail: z.string().email().optional(),
  deliveryAddress: z.string().min(2).max(255),
  deliveryCity: z.string().min(2).max(80),
  deliveryType: z.nativeEnum(DeliveryType).default("STANDARD"),
  isFragile: z.boolean().default(false),
  codAmount: z.number().min(0).default(0),
  description: z.string().max(255).optional(),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const cancelShipmentSchema = z.object({
  reason: z.string().min(2, "Raison trop courte").max(255),
});

export type CancelShipmentInput = z.infer<typeof cancelShipmentSchema>;

export const listShipmentFiltersSchema = z.object({
  status: z.nativeEnum(ShipmentStatus).optional(),
  deliveryType: z.nativeEnum(DeliveryType).optional(),
  expediteurId: z.string().cuid().optional(),
  city: z.string().max(80).optional(),
});

export type ListShipmentFilters = z.infer<typeof listShipmentFiltersSchema>;
