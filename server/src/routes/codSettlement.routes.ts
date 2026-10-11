import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import { settleLivreurSchema } from "../schemas/codSettlement.schema.js";
import {
  getLivreurBalances,
  settleLivreur,
  getLivreurSettlements,
  getMyLivreurBalance,
} from "../services/codSettlement.service.js";

/* =====================================================
   /api/v1/finance/* — FINANCE_MANAGER + SUPER_ADMIN
   (l'admin a accès LECTURE ; seuls finance + admin peuvent encaisser)
   ===================================================== */
export const financeRouter = Router();

// Lecture : finance + admin
const READ_ROLES = ["FINANCE_MANAGER", "SUPER_ADMIN"] as const;
// Écriture (encaisser) : finance + admin
const WRITE_ROLES = ["FINANCE_MANAGER", "SUPER_ADMIN"] as const;

financeRouter.use(requireAuth);

/** GET /finance/livreur-balances — soldes COD de tous les livreurs */
financeRouter.get(
  "/livreur-balances",
  requireRole(...READ_ROLES),
  asyncH(async (_req, res) => {
    res.json(await getLivreurBalances());
  })
);

/** GET /finance/livreur-settlements — historique des reversements livreurs */
financeRouter.get(
  "/livreur-settlements",
  requireRole(...READ_ROLES),
  asyncH(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    res.json(await getLivreurSettlements(limit));
  })
);

/** POST /finance/livreur-settle — enregistrer un reversement (total ou partiel) */
financeRouter.post(
  "/livreur-settle",
  requireRole(...WRITE_ROLES),
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = settleLivreurSchema.parse(req.body);
    const result = await settleLivreur({
      actorUserId: req.user.sub,
      livreurId: data.livreurId,
      amount: data.amount,
      method: data.method,
      reference: data.reference,
      note: data.note,
    });
    res.json(result);
  })
);

/* =====================================================
   /api/v1/livreur/cod — le livreur voit SON solde
   ===================================================== */
export const livreurCodRouter = Router();

livreurCodRouter.use(requireAuth, requireRole("LIVREUR"));

/** GET /livreur/cod — solde COD du livreur connecté + son historique */
livreurCodRouter.get(
  "/",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await getMyLivreurBalance(req.user.sub));
  })
);
