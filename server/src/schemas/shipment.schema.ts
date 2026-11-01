import { z } from "zod";
import { ShipmentStatus, DeliveryType } from "@prisma/client";

// Création de colis : voir createShipmentV2.schema.ts (v2 Dortmund, prix serveur + wallet)

export const listShipmentFiltersSchema = z.object({
  status: z.nativeEnum(ShipmentStatus).optional(),
  deliveryType: z.nativeEnum(DeliveryType).optional(),
  expediteurId: z.string().cuid().optional(),
  city: z.string().max(80).optional(),
});

export type ListShipmentFilters = z.infer<typeof listShipmentFiltersSchema>;
