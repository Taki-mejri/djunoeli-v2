import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import { paginationSchema } from "../lib/pagination.js";
import { listShipmentFiltersSchema } from "../schemas/shipment.schema.js";
import {
  listShipments,
  getShipmentById,
  getMyShipment,
  createShipment,
} from "../services/shipment.service.js";
import { createShipmentV2Schema } from "../schemas/createShipmentV2.schema.js";
import { cancelShipmentV2Schema } from "../schemas/deliveryV2.schema.js";
import { cancelShipment } from "../services/cancellation.service.js";

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
    // v2 : le prix éventuellement envoyé par le client est ignoré (clé inconnue
    // retirée par Zod) ; le serveur recalcule et débite le wallet.
    const data = createShipmentV2Schema.parse(req.body);
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

/** POST /expediteur/shipments/:id/cancel { reason? } — v2 : avant ramassage, 100 % remboursé (403 si pas son colis) */
expediteurShipmentsRouter.post(
  "/:id/cancel",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = cancelShipmentV2Schema.parse(req.body);
    res.json(
      await cancelShipment({
        shipmentId: req.params.id as string,
        actorUserId: req.user.sub,
        byExpediteur: true,
        reason: data.reason,
      })
    );
  })
);
