import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import { openSessionSchema, verifyScanSchema, closeSessionSchema } from "../schemas/inventory.schema.js";
import {
  getExpectedAtWarehouse,
  openSession,
  verifyScan,
  getSessionState,
  closeSession,
  getSessionHistory,
  getCurrentOpenSession,
} from "../services/inventory.service.js";

/* =====================================================
   /api/v1/dispatch/inventory/*
   Rôles : DISPATCHER + SUPER_ADMIN (admin voit en lecture)
   ===================================================== */
export const inventoryRouter = Router();

inventoryRouter.use(requireAuth, requireRole("DISPATCHER", "SUPER_ADMIN"));

/** GET /dispatch/inventory/expected — colis attendus au dépôt */
inventoryRouter.get(
  "/expected",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await getExpectedAtWarehouse(req.user.sub));
  })
);

/** GET /dispatch/inventory/current — session ouverte courante */
inventoryRouter.get(
  "/current",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await getCurrentOpenSession(req.user.sub));
  })
);

/** POST /dispatch/inventory/open — ouvrir une session */
inventoryRouter.post(
  "/open",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = openSessionSchema.parse(req.body);
    res.json(await openSession(req.user.sub, data.note));
  })
);

/** POST /dispatch/inventory/:id/scan — vérifier un colis */
inventoryRouter.post(
  "/:id/scan",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = verifyScanSchema.parse(req.body);
    res.json(await verifyScan(req.user.sub, req.params.id as string, data.trackingNumber));
  })
);

/** GET /dispatch/inventory/:id — état d'une session */
inventoryRouter.get(
  "/:id",
  asyncH(async (req, res) => {
    res.json(await getSessionState(req.params.id as string));
  })
);

/** POST /dispatch/inventory/:id/close — clôturer */
inventoryRouter.post(
  "/:id/close",
  asyncH(async (req, res) => {
    const data = closeSessionSchema.parse(req.body);
    res.json(await closeSession(req.params.id as string, data.note));
  })
);

/** GET /dispatch/inventory-history — historique des sessions */
export const inventoryHistoryRouter = Router();
inventoryHistoryRouter.use(requireAuth, requireRole("DISPATCHER", "SUPER_ADMIN"));
inventoryHistoryRouter.get(
  "/",
  asyncH(async (_req, res) => {
    res.json(await getSessionHistory());
  })
);
