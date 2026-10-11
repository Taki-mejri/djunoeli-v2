import { z } from "zod";
import { ShipmentStatus, DeliveryType } from "@prisma/client";

export const estimateSchema = z.object({
  deliveryType: z.nativeEnum(DeliveryType),
  isFragile: z.boolean().default(false),
});

export type EstimateInput = z.infer<typeof estimateSchema>;

// Création de colis : voir createShipmentV2.schema.ts (v2 Dortmund, prix serveur + wallet)

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
