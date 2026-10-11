import { z } from "zod";
import { UserRole } from "@prisma/client";

/* ---------- REGISTER ---------- */

export const registerSchema = z.object({
  email: z.string().min(1, "Email requis").email("Email invalide"),
  password: z
    .string()
    .min(8, "Au moins 8 caractères")
    .max(72, "Maximum 72 caractères") // limite bcrypt
    .regex(/[A-Za-z]/, "Doit contenir au moins une lettre")
    .regex(/[0-9]/, "Doit contenir au moins un chiffre"),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{7,20}$/, "Téléphone invalide")
    .optional(),
  role: z.nativeEnum(UserRole),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/* ---------- LOGIN ---------- */

export const loginSchema = z.object({
  email: z.string().min(1, "Email requis").email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type LoginInput = z.infer<typeof loginSchema>;
