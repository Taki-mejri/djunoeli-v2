import { z } from "zod";

/* =====================================================
   Demande d'OTP (envoi)
   ===================================================== */
export const requestOtpSchema = z.object({
  phone: z
    .string({ error: "Numéro de téléphone requis" })
    .trim()
    .min(6, "Numéro de téléphone invalide")
    .max(20, "Numéro de téléphone invalide"),
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

/* =====================================================
   Vérification d'OTP
   ===================================================== */
export const verifyOtpSchema = z.object({
  phone: z
    .string({ error: "Numéro de téléphone requis" })
    .trim()
    .min(6, "Numéro de téléphone invalide")
    .max(20),
  code: z
    .string({ error: "Code requis" })
    .trim()
    .regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
