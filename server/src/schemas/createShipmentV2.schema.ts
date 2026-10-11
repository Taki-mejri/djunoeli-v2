import { z } from "zod";
import { DORTMUND_DISTRICTS } from "../lib/dortmundGeo.js";

/**
 * Schéma de création de colis v2 (Dortmund).
 * - Plus de COD.
 * - deliveryType : SIMPLE | EXPRESS.
 * - fragile : booléen (info livreur, pas de surcoût).
 * - Le PRIX n'est PAS fourni par le client : le serveur le recalcule.
 */
export const createShipmentV2Schema = z.object({
  receiverName: z.string({ error: "Nom du destinataire requis" }).min(2).max(120),
  receiverPhone: z
    .string({ error: "Téléphone requis" })
    .regex(/^\+?[0-9\s-]{7,20}$/, "Téléphone invalide"),
  receiverEmail: z.string().email("Email invalide").optional(),
  deliveryCity: z.enum(DORTMUND_DISTRICTS, {
    error: "Quartier de Dortmund requis",
  }),
  // Obligatoire : le livreur a besoin de l'adresse exacte (le prix retombe
  // quand même sur le centre du quartier si le géocodage échoue).
  deliveryAddress: z.string({ error: "Adresse requise" }).trim().min(5, "Adresse requise").max(200),
  deliveryType: z.enum(["SIMPLE", "EXPRESS"], { error: "Type de livraison invalide" }),
  isFragile: z.boolean().optional().default(false),
  description: z.string().max(300).optional(),
});

export type CreateShipmentV2Input = z.infer<typeof createShipmentV2Schema>;
