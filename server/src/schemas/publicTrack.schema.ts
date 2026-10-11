import { z } from "zod";

/* =====================================================
   SUIVI PUBLIC — validation du numéro de suivi
   ===================================================== */
export const publicTrackSchema = z.object({
  trackingNumber: z
    .string({ error: "Numéro de suivi requis" })
    .trim()
    .min(3, "Numéro de suivi invalide")
    .max(40, "Numéro de suivi invalide"),
});

export type PublicTrackInput = z.infer<typeof publicTrackSchema>;
