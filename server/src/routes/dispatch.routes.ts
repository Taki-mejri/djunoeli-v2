import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import { unassignSchema } from "../schemas/dispatch.schema.js";
import {
  unassignLivreurFromShipment,
  suggestBestLivreur,
  getLivreurJob,
} from "../services/dispatch.service.js";
import { logCallSchema } from "../schemas/livreurJob.schema.js";
import { logCall } from "../services/livreurJob.service.js";
import {
  assignToLivreurSchema,
  pickupScanSchema,
  advanceDeliverySchema,
} from "../schemas/deliveryV2.schema.js";
import {
  assignToLivreur,
  pickupByScan,
  advanceDelivery,
  getMyJobs,
} from "../services/deliveryV2.service.js";
import { listAssignableShipments, listLivreurs } from "../services/adminDispatch.service.js";

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
    // v2 : → ASSIGNED (le livreur ramassera par scan au magasin)
    const data = assignToLivreurSchema.parse(req.body);
    res.json(
      await assignToLivreur({
        actorUserId: req.user.sub,
        shipmentId: req.params.id as string,
        livreurId: data.livreurId,
        note: data.note,
      })
    );
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
   /api/v1/admin/dispatch/* — lectures pour la page admin Zuweisung
   (l'assignation passe par POST /admin/shipments/:id/assign ci-dessus)
   ===================================================== */
export const adminDispatchReadRouter = Router();

adminDispatchReadRouter.use(requireAuth, requireRole(...ADMIN_ROLES));

/** GET /admin/dispatch/shipments — PENDING + ASSIGNED, Express d'abord */
adminDispatchReadRouter.get(
  "/shipments",
  asyncH(async (_req, res) => {
    res.json(await listAssignableShipments());
  })
);

/** GET /admin/dispatch/livreurs — livreurs + charge active */
adminDispatchReadRouter.get(
  "/livreurs",
  asyncH(async (_req, res) => {
    res.json(await listLivreurs());
  })
);

/* =====================================================
   /api/v1/livreur/jobs
   ===================================================== */
export const livreurJobsRouter = Router();

livreurJobsRouter.use(requireAuth, requireRole("LIVREUR"));

/** GET /livreur/jobs — courses actives (ASSIGNED / PICKED_UP / OUT_FOR_DELIVERY), Express d'abord */
livreurJobsRouter.get(
  "/",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await getMyJobs(req.user.sub));
  })
);

livreurJobsRouter.get(
  "/:id",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await getLivreurJob(req.params.id as string, req.user.sub));
  })
);

/** PATCH /livreur/jobs/:id/status { status, reason? } — v2, sans COD */
livreurJobsRouter.patch(
  "/:id/status",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = advanceDeliverySchema.parse(req.body);
    res.json(
      await advanceDelivery({
        livreurUserId: req.user.sub,
        shipmentId: req.params.id as string,
        target: data.status,
        reason: data.reason,
      })
    );
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

/* =====================================================
   /api/v1/livreur/pickup — ramassage par scan au magasin (v2)
   ===================================================== */
export const livreurPickupRouter = Router();

livreurPickupRouter.use(requireAuth, requireRole("LIVREUR"));

/** POST /livreur/pickup { trackingNumber } → PICKED_UP (+ chrono si Express) */
livreurPickupRouter.post(
  "/",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = pickupScanSchema.parse(req.body);
    res.json(await pickupByScan(req.user.sub, data.trackingNumber));
  })
);
