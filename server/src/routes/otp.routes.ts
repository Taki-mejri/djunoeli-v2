import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncH } from "../middleware/errorHandler.js";
import { requestOtpSchema, verifyOtpSchema } from "../schemas/otp.schema.js";
import { requestOtp, verifyOtpAndGetShipments } from "../services/otp.service.js";

/* =====================================================
   /api/v1/public/otp/*  — PUBLIC (SANS AUTH)
   Suivi par téléphone + OTP.
   ===================================================== */
export const otpRouter = Router();

/* -----------------------------------------------------
   RATE LIMITERS par IP (meme pattern que /auth/login).
   Le cooldown de 60s par NUMERO est gere dans le service ;
   ceux-ci protegent en plus par IP (cout d'envoi + brute force).
   ----------------------------------------------------- */

// /request : 3 demandes d'envoi par IP / 10 min
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Trop de demandes de code. Reessayez dans quelques minutes.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// /verify : 10 tentatives par IP / 10 min (en plus des 5 tentatives par OTP)
const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Trop de tentatives. Reessayez dans quelques minutes.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /public/otp/request  { phone }
 * Envoie un OTP (simulation par défaut → code dans les logs serveur).
 * Réponse générique (anti-énumération) : on ne révèle jamais si le numéro
 * a des colis ou non. On confirme juste que "si un compte existe, un code
 * a été envoyé".
 */
otpRouter.post(
  "/request",
  otpRequestLimiter,
  asyncH(async (req, res) => {
    const { phone } = requestOtpSchema.parse(req.body);
    const result = await requestOtp(phone);
    // IMPORTANT : ne JAMAIS renvoyer le code au client, même en simulation.
    // Le champ "simulated" indique juste au front d'afficher un hint
    // "regardez les logs serveur" en dev — à retirer/ignorer en prod.
    res.json({
      ok: true,
      message: "Si des colis sont associés à ce numéro, un code a été envoyé.",
      simulated: result.simulated,
    });
  })
);

/**
 * POST /public/otp/verify  { phone, code }
 * Vérifie l'OTP et renvoie les colis (données non sensibles uniquement).
 */
otpRouter.post(
  "/verify",
  otpVerifyLimiter,
  asyncH(async (req, res) => {
    const { phone, code } = verifyOtpSchema.parse(req.body);
    const result = await verifyOtpAndGetShipments(phone, code);
    res.json(result);
  })
);
