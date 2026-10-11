import { z } from "zod";

/* =====================================================
   Transitions autorisées par le livreur
   ===================================================== */

/**
 * Les statuts vers lesquels un livreur peut faire avancer sa course.
 * On NE permet PAS au livreur de mettre AT_WAREHOUSE, PENDING, etc.
 * (ça, c'est le rôle du dispatcher ou de l'admin).
 */
export const livreurTargetStatusSchema = z.object({
  status: z.enum(
    ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED_DELIVERY"],
    { error: "Statut de course invalide" }
  ),
  /** Note optionnelle (obligatoire en cas d'échec — validée dans le service) */
  note: z.string().max(300).optional(),
  /** Confirmation d'encaissement du COD (requis si le colis a un COD et passe DELIVERED) */
  codCollected: z.boolean().optional(),
});

export type LivreurTargetStatusInput = z.infer<typeof livreurTargetStatusSchema>;

/* =====================================================
   Log d'appel (le livreur a appelé le destinataire)
   ===================================================== */

export const logCallSchema = z.object({
  /** Résultat de l'appel */
  outcome: z.enum(["ANSWERED", "NO_ANSWER", "WRONG_NUMBER", "RESCHEDULED"], {
    error: "Résultat d'appel invalide",
  }),
  note: z.string().max(300).optional(),
});

export type LogCallInput = z.infer<typeof logCallSchema>;
