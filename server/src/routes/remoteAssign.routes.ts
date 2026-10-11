import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import { remoteAssignSchema, assignableQuerySchema } from "../schemas/remoteAssign.schema.js";
import {
  getAssignableShipments,
  getAssignableLivreurs,
  remoteAssign,
} from "../services/remoteAssign.service.js";

/* =====================================================
   /api/v1/remote-assign/*
   Partagé par ADMIN (SUPER_ADMIN) et DISPATCHER.
   ===================================================== */
export const remoteAssignRouter = Router();

const ROLES = ["SUPER_ADMIN", "DISPATCHER"] as const;

remoteAssignRouter.use(requireAuth, requireRole(...ROLES));

/** GET /remote-assign/shipments — colis assignables (tout sauf terminés) */
remoteAssignRouter.get(
  "/shipments",
  asyncH(async (req, res) => {
    const { search } = assignableQuerySchema.parse({ search: req.query.search });
    res.json(await getAssignableShipments(search));
  })
);

/** GET /remote-assign/livreurs — livreurs disponibles */
remoteAssignRouter.get(
  "/livreurs",
  asyncH(async (_req, res) => {
    res.json(await getAssignableLivreurs());
  })
);

/** POST /remote-assign — assigner un colis à distance à un livreur */
remoteAssignRouter.post(
  "/",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = remoteAssignSchema.parse(req.body);
    const result = await remoteAssign({
      actorUserId: req.user.sub,
      shipmentId: data.shipmentId,
      livreurId: data.livreurId,
      reason: data.reason,
    });
    res.json(result);
  })
);
