import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import { paginationSchema } from "../lib/pagination.js";
import {
  createLivreurSchema,
  updateLivreurSchema,
  livreurSelfStatusSchema,
  listLivreursFiltersSchema,
} from "../schemas/livreur.schema.js";
import {
  listLivreurs,
  getLivreurById,
  getLivreurByUserId,
  createLivreur,
  updateLivreur,
  deleteLivreur,
  setLivreurSelfStatus,
} from "../services/livreur.service.js";

/* =====================================================
   /api/v1/admin/livreurs  (admin only)
   ===================================================== */
export const adminLivreursRouter = Router();

const ADMIN_ROLES = ["SUPER_ADMIN", "OPERATIONS_MANAGER", "CUSTOMER_SUPPORT"] as const;

adminLivreursRouter.use(requireAuth, requireRole(...ADMIN_ROLES));

adminLivreursRouter.get(
  "/",
  asyncH(async (req, res) => {
    const pagination = paginationSchema.parse(req.query);
    const filters = listLivreursFiltersSchema.parse(req.query);
    res.json(await listLivreurs(pagination, filters));
  })
);

adminLivreursRouter.get(
  "/:id",
  asyncH(async (req, res) => {
    res.json(await getLivreurById(req.params.id as string));
  })
);

adminLivreursRouter.post(
  "/",
  asyncH(async (req, res) => {
    const data = createLivreurSchema.parse(req.body);
    const created = await createLivreur(data);
    res.status(201).json(created);
  })
);

adminLivreursRouter.patch(
  "/:id",
  asyncH(async (req, res) => {
    const data = updateLivreurSchema.parse(req.body);
    const updated = await updateLivreur(req.params.id as string, data);
    res.json(updated);
  })
);

adminLivreursRouter.delete(
  "/:id",
  asyncH(async (req, res) => {
    await deleteLivreur(req.params.id as string);
    res.status(204).end();
  })
);

/* =====================================================
   /api/v1/livreur  (livreur connecté — son propre profil)
   ===================================================== */
export const livreurSelfRouter = Router();

livreurSelfRouter.use(requireAuth, requireRole("LIVREUR"));

/** GET /livreur/me — son propre profil */
livreurSelfRouter.get(
  "/me",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await getLivreurByUserId(req.user.sub));
  })
);

/** PATCH /livreur/me/status — toggle Dispo / Hors ligne */
livreurSelfRouter.patch(
  "/me/status",
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = livreurSelfStatusSchema.parse(req.body);
    res.json(await setLivreurSelfStatus(req.user.sub, data));
  })
);
