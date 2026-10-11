import { z } from "zod";

/* =====================================================
   REVERSEMENT LIVREUR — le livreur rend son cash COD
   ===================================================== */

export const settleLivreurSchema = z.object({
  livreurId: z.string().cuid("livreurId invalide"),
  /**
   * Montant reversé. Si omis, on prend la totalité du solde du livreur.
   * Si fourni, doit être > 0 et <= solde courant (validé dans le service).
   */
  amount: z.number().positive("Le montant doit être positif").optional(),
  /** Méthode de reversement */
  method: z.enum(["CASH", "BANK_TRANSFER", "CHECK"], {
    error: "Méthode de reversement invalide",
  }).optional(),
  /** Référence optionnelle (numéro de reçu, virement, chèque...) */
  reference: z.string().max(100).optional(),
  note: z.string().max(300).optional(),
});

export type SettleLivreurInput = z.infer<typeof settleLivreurSchema>;
