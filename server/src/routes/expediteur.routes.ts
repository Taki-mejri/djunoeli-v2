import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import { paginationSchema } from "../lib/pagination.js";
import {
  createExpediteurSchema,
  updateExpediteurSchema,
  listExpediteursFiltersSchema,
} from "../schemas/expediteur.schema.js";
import {
  listExpediteurs,
  getExpediteurById,
  getExpediteurByUserId,
  createExpediteur,
  updateExpediteur,
  deleteExpediteur,
} from "../services/expediteur.service.js";

/* =====================================================
   /api/v1/admin/expediteurs  (réservé aux rôles admin)
   ===================================================== */
export const adminExpediteursRouter = Router();

// Toutes les routes ci-dessous nécessitent ces rôles
const ADMIN_ROLES = ["SUPER_ADMIN", "OPERATIONS_MANAGER", "CUSTOMER_SUPPORT"] as const;

adminExpediteursRouter.use(requireAuth, requireRole(...ADMIN_ROLES));

/** GET /admin/expediteurs?page=&pageSize=&search=&sort=&status=&city= */
adminExpediteursRouter.get(
  "/",
  asyncH(async (req, res) => {
    const pagination = paginationSchema.parse(req.query);
    const filters = listExpediteursFiltersSchema.parse(req.query);
    const result = await listExpediteurs(pagination, filters);
    res.json(result);
  })
);

/** GET /admin/expediteurs/:id */
adminExpediteursRouter.get(
  "/:id",
  asyncH(async (req, res) => {
    const exp = await getExpediteurById(req.params.id as string);
    res.json(exp);
  })
);

/** POST /admin/expediteurs */
adminExpediteursRouter.post(
  "/",
  asyncH(async (req, res) => {
    const data = createExpediteurSchema.parse(req.body);
    const created = await createExpediteur(data);
    res.status(201).json(created);
  })
);

/** PATCH /admin/expediteurs/:id */
adminExpediteursRouter.patch(
  "/:id",
  asyncH(async (req, res) => {
    const data = updateExpediteurSchema.parse(req.body);
    const updated = await updateExpediteur(req.params.id as string, data);
    res.json(updated);
  })
);

/** DELETE /admin/expediteurs/:id  (soft delete) */
adminExpediteursRouter.delete(
  "/:id",
  asyncH(async (req, res) => {
    await deleteExpediteur(req.params.id as string);
    res.status(204).end();
  })
);

/* =====================================================
   /api/v1/expediteur/me  (l'expéditeur connecté voit son propre profil)
   ===================================================== */
export const expediteurSelfRouter = Router();

expediteurSelfRouter.use(requireAuth, requireRole("EXPEDITEUR"));

/** GET /expediteur/me */
expediteurSelfRouter.get(
  "/me",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const profile = await getExpediteurByUserId(req.user.sub);
    res.json(profile);
  })
);
