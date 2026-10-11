import { z } from "zod";

/* =====================================================
   CREATE — Admin crée un nouveau livreur
   (Crée simultanément User + Livreur)
   ===================================================== */

export const createLivreurSchema = z.object({
  // Côté User
  email: z.string().email("Email invalide").transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Au moins 8 caractères")
    .max(72)
    .regex(/[A-Za-z]/, "Doit contenir une lettre")
    .regex(/[0-9]/, "Doit contenir un chiffre"),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  phone: z.string().regex(/^\+?[0-9\s-]{7,20}$/, "Téléphone invalide").optional(),

  // Côté Livreur
  cin: z.string().regex(/^[0-9]{8}$/, "CIN doit être 8 chiffres").optional(),
  vehicleType: z.enum(["MOTO", "VOITURE", "CAMIONNETTE", "CAMION"]),
  vehiclePlate: z.string().max(20).optional(),
  zoneId: z.string().cuid().optional(),
});

export type CreateLivreurInput = z.infer<typeof createLivreurSchema>;

/* =====================================================
   UPDATE — PATCH partiel
   ===================================================== */

export const updateLivreurSchema = z.object({
  // User
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().regex(/^\+?[0-9\s-]{7,20}$/, "Téléphone invalide").optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING"]).optional(),

  // Livreur
  cin: z.string().regex(/^[0-9]{8}$/, "CIN doit être 8 chiffres").optional(),
  vehicleType: z.enum(["MOTO", "VOITURE", "CAMIONNETTE", "CAMION"]).optional(),
  vehiclePlate: z.string().max(20).optional(),
  zoneId: z.string().cuid().optional().nullable(),
  livreurStatus: z.enum(["AVAILABLE", "BUSY", "OFFLINE"]).optional(),
});

export type UpdateLivreurInput = z.infer<typeof updateLivreurSchema>;

/* =====================================================
   SELF status — le livreur bascule sa disponibilité
   ===================================================== */

export const livreurSelfStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "OFFLINE"]), // un livreur ne peut pas se mettre BUSY lui-même
});

export type LivreurSelfStatusInput = z.infer<typeof livreurSelfStatusSchema>;

/* =====================================================
   LIST — filtres listing
   ===================================================== */

export const listLivreursFiltersSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING"]).optional(),
  livreurStatus: z.enum(["AVAILABLE", "BUSY", "OFFLINE"]).optional(),
  vehicleType: z.enum(["MOTO", "VOITURE", "CAMIONNETTE", "CAMION"]).optional(),
  zoneId: z.string().cuid().optional(),
});

export type ListLivreursFilters = z.infer<typeof listLivreursFiltersSchema>;
