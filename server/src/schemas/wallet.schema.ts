import { z } from "zod";

/* =====================================================
   Crédit admin du wallet d'un expéditeur
   ===================================================== */
export const creditWalletSchema = z.object({
  amount: z
    .number({ error: "Montant requis" })
    .positive("Le montant doit être positif")
    .max(100000, "Montant trop élevé"),
  note: z.string().max(300).optional(),
});
export type CreditWalletInput = z.infer<typeof creditWalletSchema>;

/* =====================================================
   Remboursement sur le wallet (ex: Express en retard)
   ===================================================== */
export const refundWalletSchema = z.object({
  amount: z
    .number({ error: "Montant requis" })
    .positive("Le montant doit être positif")
    .max(100000, "Montant trop élevé"),
  note: z.string().max(300).optional(),
  shipmentId: z.string().cuid().optional(), // le colis concerné (optionnel)
});
export type RefundWalletInput = z.infer<typeof refundWalletSchema>;
