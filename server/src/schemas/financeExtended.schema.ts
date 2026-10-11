import { z } from "zod";

/* =====================================================
   REVERSEMENT COD À L'EXPÉDITEUR
   ===================================================== */

export const settleExpediteurSchema = z.object({
  expediteurId: z.string().cuid("expediteurId invalide"),
  method: z.enum(["CASH", "BANK_TRANSFER", "CHECK"], {
    error: "Méthode invalide",
  }).optional(),
  reference: z.string().max(100).optional(),
  note: z.string().max(300).optional(),
});

export type SettleExpediteurInput = z.infer<typeof settleExpediteurSchema>;

/* =====================================================
   GÉNÉRATION DE FACTURE (frais de livraison)
   ===================================================== */

export const generateInvoiceSchema = z.object({
  expediteurId: z.string().cuid("expediteurId invalide"),
  /** Période optionnelle — sinon prend tous les colis non facturés */
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  note: z.string().max(300).optional(),
});

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;

/* =====================================================
   MARQUER UNE FACTURE PAYÉE
   ===================================================== */

export const payInvoiceSchema = z.object({
  method: z.enum(["CASH", "BANK_TRANSFER", "CHECK"], {
    error: "Méthode invalide",
  }).optional(),
  reference: z.string().max(100).optional(),
});

export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;
