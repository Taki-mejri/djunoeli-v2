import { z } from "zod";
import { DORTMUND_DISTRICTS } from "../lib/dortmundGeo.js";

export const estimateSchema = z.object({
  quartier: z.enum(DORTMUND_DISTRICTS, { error: "Quartier requis (un des quartiers de Dortmund)" }),
  address: z.string().max(200).optional(),
  type: z.enum(["SIMPLE", "EXPRESS"], { error: "Type de livraison invalide" }).optional(),
});

export type EstimateInput = z.infer<typeof estimateSchema>;
