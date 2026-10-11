import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import { creditWalletSchema, refundWalletSchema } from "../schemas/wallet.schema.js";
import {
  getMyWallet,
  getWalletByExpediteur,
  listWallets,
  creditWallet,
  refundWallet,
} from "../services/wallet.service.js";

/* =====================================================
   /api/v1/wallet/*  — l'expéditeur voit SON wallet
   ===================================================== */
export const walletRouter = Router();
walletRouter.use(requireAuth, requireRole("EXPEDITEUR"));

/** GET /wallet/me — solde + historique de l'expéditeur connecté */
walletRouter.get(
  "/me",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await getMyWallet(req.user.sub));
  })
);

/* =====================================================
   /api/v1/admin/wallets/*  — gestion admin
   (SUPER_ADMIN + FINANCE_MANAGER peuvent créditer/rembourser)
   ===================================================== */
export const adminWalletRouter = Router();
const ADMIN_ROLES = ["SUPER_ADMIN", "FINANCE_MANAGER"] as const;
adminWalletRouter.use(requireAuth, requireRole(...ADMIN_ROLES));

/** GET /admin/wallets — liste de tous les wallets */
adminWalletRouter.get(
  "/",
  asyncH(async (_req, res) => {
    res.json(await listWallets());
  })
);

/** GET /admin/wallets/:expediteurId — détail d'un wallet */
adminWalletRouter.get(
  "/:expediteurId",
  asyncH(async (req, res) => {
    res.json(await getWalletByExpediteur(req.params.expediteurId as string));
  })
);

/** POST /admin/wallets/:expediteurId/credit — créditer (+ bonus si 1er) */
adminWalletRouter.post(
  "/:expediteurId/credit",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = creditWalletSchema.parse(req.body);
    res.json(
      await creditWallet({
        expediteurId: req.params.expediteurId as string,
        amount: data.amount,
        note: data.note,
        actorUserId: req.user.sub,
      })
    );
  })
);

/** POST /admin/wallets/:expediteurId/refund — rembourser */
adminWalletRouter.post(
  "/:expediteurId/refund",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = refundWalletSchema.parse(req.body);
    res.json(
      await refundWallet({
        expediteurId: req.params.expediteurId as string,
        amount: data.amount,
        note: data.note,
        shipmentId: data.shipmentId,
        actorUserId: req.user.sub,
      })
    );
  })
);
