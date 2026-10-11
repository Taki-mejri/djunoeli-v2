import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncH } from "../middleware/errorHandler.js";
import { publicTrackSchema } from "../schemas/publicTrack.schema.js";
import { getPublicTracking } from "../services/publicTrack.service.js";

/* =====================================================
   /api/v1/public/*  — ENDPOINTS PUBLICS (SANS AUTH)
   Ne PAS ajouter requireAuth ici : c'est volontairement public.
   ===================================================== */
export const publicRouter = Router();

/**
 * Rate limiter leger par IP : un endpoint public de suivi peut etre scrape
 * (enumeration de numeros de suivi). 30 requetes / minute suffisent
 * largement a un usage humain normal.
 */
const publicTrackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error: { code: "TOO_MANY_REQUESTS", message: "Trop de requetes. Reessayez dans une minute." },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /public/track/:trackingNumber
 * Suivi public d'un colis. Aucune authentification.
 * Ne renvoie que des données non sensibles (voir le service).
 */
publicRouter.get(
  "/track/:trackingNumber",
  publicTrackLimiter,
  asyncH(async (req, res) => {
    const { trackingNumber } = publicTrackSchema.parse({
      trackingNumber: req.params.trackingNumber,
    });
    const data = await getPublicTracking(trackingNumber);
    res.json(data);
  })
);
