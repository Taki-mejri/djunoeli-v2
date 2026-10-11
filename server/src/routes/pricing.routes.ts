import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncH } from "../middleware/errorHandler.js";
import { estimateSchema } from "../schemas/pricing.schema.js";
import { estimatePrice } from "../services/pricing.service.js";

/* =====================================================
   /api/v1/pricing/*  — estimation de prix à la distance
   Auth requise (l'expéditeur estime avant de créer).
   ===================================================== */
export const pricingRouter = Router();

pricingRouter.use(requireAuth);

/**
 * POST /pricing/estimate  { quartier, address?, type? }
 * Renvoie distance + prix simple/express (+ prix du type si fourni).
 */
pricingRouter.post(
  "/estimate",
  asyncH(async (req, res) => {
    const data = estimateSchema.parse(req.body);
    const result = await estimatePrice({
      quartier: data.quartier,
      address: data.address,
      type: data.type,
    });
    res.json(result);
  })
);
