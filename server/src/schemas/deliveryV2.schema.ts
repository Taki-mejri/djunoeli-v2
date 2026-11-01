import { z } from "zod";

/* =====================================================
   ADMIN — assigner un colis à un livreur
   ===================================================== */
export const assignToLivreurSchema = z.object({
  livreurId: z.string().cuid("livreurId invalide"),
  note: z.string().trim().max(300).optional(),
});
export type AssignToLivreurInput = z.infer<typeof assignToLivreurSchema>;

/* =====================================================
   LIVREUR — ramassage par scan (au magasin)
   ===================================================== */
export const pickupScanSchema = z.object({
  // Insensible à la casse : un scan/saisie "trk-2026-00001" retrouve TRK-2026-00001
  trackingNumber: z.string({ error: "Numéro de suivi requis" }).trim().min(3).max(40).toUpperCase(),
});
export type PickupScanInput = z.infer<typeof pickupScanSchema>;

/* =====================================================
   LIVREUR — échec de livraison (raison obligatoire)
   ===================================================== */
export const failDeliverySchema = z.object({
  reason: z.string({ error: "Raison requise" }).trim().min(3, "Raison requise").max(300),
});
export type FailDeliveryInput = z.infer<typeof failDeliverySchema>;

/* =====================================================
   LIVREUR — faire avancer une course
   PATCH /livreur/jobs/:id/status { status, reason? }
   (raison obligatoire pour FAILED_DELIVERY, vérifiée par le service)
   ===================================================== */
export const advanceDeliverySchema = z.object({
  status: z.enum(["OUT_FOR_DELIVERY", "DELIVERED", "FAILED_DELIVERY"], {
    error: "Statut invalide (OUT_FOR_DELIVERY | DELIVERED | FAILED_DELIVERY)",
  }),
  reason: z.string().trim().max(300).optional(),
});
export type AdvanceDeliveryInput = z.infer<typeof advanceDeliverySchema>;

/* =====================================================
   Annulation (expéditeur ou admin) — motif facultatif
   ===================================================== */
export const cancelShipmentV2Schema = z.object({
  reason: z.string().trim().max(300).optional(),
});
export type CancelShipmentV2Input = z.infer<typeof cancelShipmentV2Schema>;
