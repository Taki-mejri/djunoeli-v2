import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import {
  scanReceiveSchema,
  scanSortSchema,
  scanAssignSchema,
} from "../schemas/dispatcherScan.schema.js";
import {
  scanReceive,
  scanSort,
  scanAssign,
  getRecentScans,
  getDispatcherStats,
  listAssignableLivreurs,
} from "../services/dispatcher.service.js";

/* =====================================================
   /api/v1/dispatch/* — réservé au rôle DISPATCHER
   ===================================================== */
export const dispatcherRouter = Router();

dispatcherRouter.use(requireAuth, requireRole("DISPATCHER"));

/** GET /dispatch/me — profil + dépôt du dispatcher connecté */
dispatcherRouter.get(
  "/me",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const stats = await getDispatcherStats(req.user.sub);
    res.json(stats);
  })
);

/** GET /dispatch/livreurs — liste des livreurs assignables (pour la page Assignation) */
dispatcherRouter.get(
  "/livreurs",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await listAssignableLivreurs(req.user.sub));
  })
);

/** POST /dispatch/scan/receive */
dispatcherRouter.post(
  "/scan/receive",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = scanReceiveSchema.parse(req.body);
    const result = await scanReceive(req.user.sub, data);
    res.json(result);
  })
);

/** POST /dispatch/scan/sort */
dispatcherRouter.post(
  "/scan/sort",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = scanSortSchema.parse(req.body);
    const result = await scanSort(req.user.sub, data);
    res.json(result);
  })
);

/** POST /dispatch/scan/assign */
dispatcherRouter.post(
  "/scan/assign",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = scanAssignSchema.parse(req.body);
    const result = await scanAssign(req.user.sub, data);
    res.json(result);
  })
);

/** GET /dispatch/scans — historique des scans du dispatcher connecté */
dispatcherRouter.get(
  "/scans",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const eventType = req.query.eventType as "RECEIVE" | "SORT" | "ASSIGN" | undefined;
    const result = await getRecentScans(
      req.user.sub,
      limit,
      eventType ? { eventType } : undefined
    );
    res.json(result);
  })
);
