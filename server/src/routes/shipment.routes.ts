import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import { paginationSchema } from "../lib/pagination.js";
import {
  estimateSchema,
  createShipmentSchema,
  cancelShipmentSchema,
  listShipmentFiltersSchema,
} from "../schemas/shipment.schema.js";
import {
  estimatePrice,
  listShipments,
  getShipmentById,
  getMyShipment,
  createShipment,
  cancelShipment,
} from "../services/shipment.service.js";

/* =====================================================
   /api/v1/admin/shipments  (réservé aux admins)
   ===================================================== */
export const adminShipmentsRouter = Router();

const ADMIN_ROLES = ["SUPER_ADMIN", "OPERATIONS_MANAGER", "CUSTOMER_SUPPORT", "WAREHOUSE_MANAGER"] as const;

adminShipmentsRouter.use(requireAuth, requireRole(...ADMIN_ROLES));

/** GET /admin/shipments */
adminShipmentsRouter.get(
  "/",
  asyncH(async (req, res) => {
    const pagination = paginationSchema.parse(req.query);
    const filters = listShipmentFiltersSchema.parse(req.query);
    res.json(await listShipments(pagination, filters));
  })
);

/** GET /admin/shipments/:id */
adminShipmentsRouter.get(
  "/:id",
  asyncH(async (req, res) => {
    res.json(await getShipmentById(req.params.id as string));
  })
);

/* =====================================================
   /api/v1/expediteur/shipments  (l'expéditeur connecté)
   ===================================================== */
export const expediteurShipmentsRouter = Router();

expediteurShipmentsRouter.use(requireAuth, requireRole("EXPEDITEUR"));

/** POST /expediteur/shipments/estimate */
expediteurShipmentsRouter.post(
  "/estimate",
  asyncH(async (req, res) => {
    const data = estimateSchema.parse(req.body);
    res.json(estimatePrice(data));
  })
);

/** GET /expediteur/shipments — liste ses propres colis */
expediteurShipmentsRouter.get(
  "/",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const pagination = paginationSchema.parse(req.query);
    const filters = listShipmentFiltersSchema.parse(req.query);
    res.json(await listShipments(pagination, filters, req.user.sub));
  })
);

/** POST /expediteur/shipments — crée un nouveau colis */
expediteurShipmentsRouter.post(
  "/",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = createShipmentSchema.parse(req.body);
    const shipment = await createShipment(req.user.sub, data);
    res.status(201).json(shipment);
  })
);

/** GET /expediteur/shipments/:id — détail (scope expéditeur) */
expediteurShipmentsRouter.get(
  "/:id",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await getMyShipment(req.params.id as string, req.user.sub));
  })
);

/** POST /expediteur/shipments/:id/cancel */
expediteurShipmentsRouter.post(
  "/:id/cancel",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = cancelShipmentSchema.parse(req.body);
    const shipment = await cancelShipment(req.params.id as string, req.user.sub, data);
    res.json(shipment);
  })
);
