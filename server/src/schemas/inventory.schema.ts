import { z } from "zod";

/* =====================================================
   Ouvrir une session d'inventaire
   ===================================================== */
export const openSessionSchema = z.object({
  note: z.string().max(300).optional(),
});
export type OpenSessionInput = z.infer<typeof openSessionSchema>;

/* =====================================================
   Scanner un colis pour le vérifier
   ===================================================== */
export const verifyScanSchema = z.object({
  trackingNumber: z.string().min(3, "Numéro de suivi requis"),
});
export type VerifyScanInput = z.infer<typeof verifyScanSchema>;

/* =====================================================
   Clôturer une session
   ===================================================== */
export const closeSessionSchema = z.object({
  note: z.string().max(300).optional(),
});
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
