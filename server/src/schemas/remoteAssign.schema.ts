import { z } from "zod";

/* =====================================================
   ASSIGNATION À DISTANCE
   Assigner un colis à un livreur sans scan (il l'a déjà).
   ===================================================== */
export const remoteAssignSchema = z.object({
  shipmentId: z.string().cuid("shipmentId invalide"),
  livreurId: z.string().cuid("livreurId invalide"),
  /** Confirmation obligatoire : l'opérateur atteste que le livreur a le colis */
  confirmed: z.literal(true, {
    error: "Vous devez confirmer que le livreur a le colis en main.",
  }),
  /**
   * Raison / contexte (ex: récupéré chez l'expéditeur).
   * error sur le type = message aussi quand le champ est absent (pas seulement trop court).
   */
  reason: z
    .string({ error: "Indiquez une raison" })
    .min(3, "Indiquez une raison (au moins 3 caractères)")
    .max(300),
});

export type RemoteAssignInput = z.infer<typeof remoteAssignSchema>;

/* =====================================================
   Liste des colis assignables à distance
   ===================================================== */
export const assignableQuerySchema = z.object({
  search: z.string().max(100).optional(),
});
export type AssignableQueryInput = z.infer<typeof assignableQuerySchema>;
