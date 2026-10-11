import { z } from "zod";

/* =====================================================
   CREATE — Admin crée un nouvel expéditeur
   (Crée simultanément un User + un Expediteur)
   ===================================================== */

export const createExpediteurSchema = z.object({
  // Côté User (compte de connexion)
  email: z.string().email("Email invalide").transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Au moins 8 caractères")
    .max(72)
    .regex(/[A-Za-z]/, "Doit contenir une lettre")
    .regex(/[0-9]/, "Doit contenir un chiffre"),
  phone: z.string().regex(/^\+?[0-9\s-]{7,20}$/, "Téléphone invalide").optional(),

  // Côté Expediteur (profil entreprise)
  companyName: z.string().min(2, "Nom de société trop court").max(120),
  contactPerson: z.string().max(120).optional(),
  taxNumber: z.string().max(60).optional(),
  businessAddress: z.string().max(255).optional(),
  city: z.string().max(80).optional(),
  postalCode: z.string().max(20).optional(),

  // Adresse de ramassage par défaut
  pickupAddress: z.string().max(255).optional(),
  pickupCity: z.string().max(80).optional(),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),

  // Finance
  creditLimit: z.number().min(0).optional(),
  pricingPlanId: z.string().cuid().optional(),
});

export type CreateExpediteurInput = z.infer<typeof createExpediteurSchema>;

/* =====================================================
   UPDATE — Modification partielle (PATCH)
   ===================================================== */

export const updateExpediteurSchema = z.object({
  // Côté User
  phone: z.string().regex(/^\+?[0-9\s-]{7,20}$/, "Téléphone invalide").optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING"]).optional(),

  // Côté Expediteur
  companyName: z.string().min(2).max(120).optional(),
  contactPerson: z.string().max(120).optional(),
  taxNumber: z.string().max(60).optional(),
  businessAddress: z.string().max(255).optional(),
  city: z.string().max(80).optional(),
  postalCode: z.string().max(20).optional(),
  pickupAddress: z.string().max(255).optional(),
  pickupCity: z.string().max(80).optional(),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
  creditLimit: z.number().min(0).optional(),
  pricingPlanId: z.string().cuid().optional().nullable(),
});

export type UpdateExpediteurInput = z.infer<typeof updateExpediteurSchema>;

/* =====================================================
   LIST — Filtres spécifiques au listing
   ===================================================== */

export const listExpediteursFiltersSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING"]).optional(),
  city: z.string().max(80).optional(),
});

export type ListExpediteursFilters = z.infer<typeof listExpediteursFiltersSchema>;
