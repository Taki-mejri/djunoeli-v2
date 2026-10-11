import { z } from "zod";

/* =====================================================
   SCAN RÉCEPTION — colis arrive au dépôt
   ===================================================== */

export const scanReceiveSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .regex(/^TRK-\d{4}-\d{5}$/, "Format de tracking invalide (attendu : TRK-2026-00001)"),
  /** Optionnel : zone de stockage dans le dépôt (ex: "B-12") */
  zone: z.string().max(50).optional(),
  /** Optionnel : note (ex: "carton abîmé à l'arrivée") */
  note: z.string().max(200).optional(),
});

export type ScanReceiveInput = z.infer<typeof scanReceiveSchema>;

/* =====================================================
   SCAN TRI — colis trié par quartier de Dortmund (Stadtteil)
   ===================================================== */

/** Doit rester synchronisé avec web-landing/src/lib/dortmund.ts */
const DORTMUND_DISTRICTS = [
  "Innenstadt-Nord", "Innenstadt-Ost", "Innenstadt-West", "Hörde", "Hombruch",
  "Aplerbeck", "Brackel", "Eving", "Huckarde", "Lütgendortmund",
  "Mengede", "Scharnhorst", "Nette", "Dorstfeld", "Kirchlinde",
  "Marten", "Wambel", "Körne", "Asseln", "Wickede",
] as const;

export const scanSortSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .regex(/^TRK-\d{4}-\d{5}$/, "Format de tracking invalide"),
  /** Quartier dans lequel le colis a été trié (doit matcher la destination du colis) */
  destinationGovernorate: z.enum(DORTMUND_DISTRICTS, {
    error: () => "Quartier invalide",
  }),
  note: z.string().max(200).optional(),
});

export type ScanSortInput = z.infer<typeof scanSortSchema>;

/* =====================================================
   SCAN ASSIGNATION — colis remis au livreur
   ===================================================== */

export const scanAssignSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .regex(/^TRK-\d{4}-\d{5}$/, "Format de tracking invalide"),
  livreurId: z.string().cuid("livreurId invalide"),
  note: z.string().max(200).optional(),
});

export type ScanAssignInput = z.infer<typeof scanAssignSchema>;
