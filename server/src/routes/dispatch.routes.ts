import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import { paginationSchema } from "../lib/pagination.js";
import { assignLivreurSchema, unassignSchema } from "../schemas/dispatch.schema.js";
import {
  assignLivreurToShipment,
  unassignLivreurFromShipment,
  suggestBestLivreur,
  listLivreurJobs,
  getLivreurJob,
} from "../services/dispatch.service.js";
import { livreurTargetStatusSchema, logCallSchema } from "../schemas/livreurJob.schema.js";
import { advanceJobStatus, logCall } from "../services/livreurJob.service.js";

const ADMIN_ROLES = ["SUPER_ADMIN", "OPERATIONS_MANAGER", "CUSTOMER_SUPPORT"] as const;

/* =====================================================
   /api/v1/admin/shipments/:id/(assign|unassign|suggest-livreur)
   ===================================================== */
export const adminDispatchRouter = Router();

adminDispatchRouter.use(requireAuth, requireRole(...ADMIN_ROLES));

adminDispatchRouter.post(
  "/:id/assign",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = assignLivreurSchema.parse(req.body);
    const updated = await assignLivreurToShipment({
      actorUserId: req.user.sub,
      shipmentId: req.params.id as string,
      livreurId: data.livreurId,
      note: data.note,
    });
    res.json(updated);
  })
);

adminDispatchRouter.post(
  "/:id/unassign",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = unassignSchema.parse(req.body);
    const updated = await unassignLivreurFromShipment(
      req.params.id as string,
      req.user.sub,
      data.reason
    );
    res.json(updated);
  })
);

adminDispatchRouter.get(
  "/:id/suggest-livreur",
  asyncH(async (req, res) => {
    const result = await suggestBestLivreur(req.params.id as string);
    res.json(result);
  })
);

/* =====================================================
   /api/v1/livreur/jobs
   ===================================================== */
export const livreurJobsRouter = Router();

livreurJobsRouter.use(requireAuth, requireRole("LIVREUR"));

livreurJobsRouter.get(
  "/",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const pagination = paginationSchema.parse(req.query);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    res.json(await listLivreurJobs(req.user.sub, pagination, { status }));
  })
);

livreurJobsRouter.get(
  "/:id",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await getLivreurJob(req.params.id as string, req.user.sub));
  })
);

/** PATCH /livreur/jobs/:id/status — le livreur fait avancer sa course */
livreurJobsRouter.patch(
  "/:id/status",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = livreurTargetStatusSchema.parse(req.body);
    const result = await advanceJobStatus({
      livreurUserId: req.user.sub,
      shipmentId: req.params.id as string,
      target: data.status,
      note: data.note,
      codCollected: data.codCollected,
    });
    res.json(result);
  })
);

/** POST /livreur/jobs/:id/call — logger un appel au destinataire */
livreurJobsRouter.post(
  "/:id/call",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = logCallSchema.parse(req.body);
    const result = await logCall(req.user.sub, req.params.id as string, data.outcome, data.note);
    res.json(result);
  })
);
