import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncH, unauthorized } from "../middleware/errorHandler.js";
import {
  settleExpediteurSchema,
  generateInvoiceSchema,
  payInvoiceSchema,
} from "../schemas/financeExtended.schema.js";
import {
  getExpediteurCodOwed,
  settleExpediteurCod,
  getExpediteurSettlements,
} from "../services/codExpediteur.service.js";
import {
  getInvoiceableForExpediteur,
  generateInvoice,
  listInvoices,
  payInvoice,
} from "../services/invoice.service.js";
import { getFinancialOverview, getShipmentStatusBreakdown } from "../services/reports.service.js";

const READ_ROLES = ["FINANCE_MANAGER", "SUPER_ADMIN"] as const;
const WRITE_ROLES = ["FINANCE_MANAGER", "SUPER_ADMIN"] as const;

/* =====================================================
   /api/v1/finance/* (suite : expéditeurs, factures, rapports)
   Ce router s'ajoute au financeRouter existant (COD livreur).
   ===================================================== */
export const financeExtendedRouter = Router();

financeExtendedRouter.use(requireAuth);

/* ----- COD expéditeurs ----- */

financeExtendedRouter.get(
  "/expediteur-cod",
  requireRole(...READ_ROLES),
  asyncH(async (_req, res) => {
    res.json(await getExpediteurCodOwed());
  })
);

financeExtendedRouter.post(
  "/expediteur-settle",
  requireRole(...WRITE_ROLES),
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = settleExpediteurSchema.parse(req.body);
    res.json(
      await settleExpediteurCod({
        actorUserId: req.user.sub,
        expediteurId: data.expediteurId,
        method: data.method,
        reference: data.reference,
        note: data.note,
      })
    );
  })
);

financeExtendedRouter.get(
  "/expediteur-settlements",
  requireRole(...READ_ROLES),
  asyncH(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    res.json(await getExpediteurSettlements(limit));
  })
);

/* ----- Factures ----- */

financeExtendedRouter.get(
  "/invoices",
  requireRole(...READ_ROLES),
  asyncH(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const expediteurId = typeof req.query.expediteurId === "string" ? req.query.expediteurId : undefined;
    res.json(await listInvoices({ status, expediteurId }));
  })
);

financeExtendedRouter.get(
  "/invoiceable/:expediteurId",
  requireRole(...READ_ROLES),
  asyncH(async (req, res) => {
    res.json(await getInvoiceableForExpediteur(req.params.expediteurId as string));
  })
);

financeExtendedRouter.post(
  "/invoices/generate",
  requireRole(...WRITE_ROLES),
  asyncH(async (req, res) => {
    if (!req.user) throw unauthorized();
    const data = generateInvoiceSchema.parse(req.body);
    res.json(
      await generateInvoice({
        actorUserId: req.user.sub,
        expediteurId: data.expediteurId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        note: data.note,
      })
    );
  })
);

financeExtendedRouter.post(
  "/invoices/:id/pay",
  requireRole(...WRITE_ROLES),
  asyncH(async (req, res) => {
    const data = payInvoiceSchema.parse(req.body);
    res.json(await payInvoice(req.params.id as string, data.method, data.reference));
  })
);

/* ----- Rapports ----- */

financeExtendedRouter.get(
  "/overview",
  requireRole(...READ_ROLES),
  asyncH(async (_req, res) => {
    res.json(await getFinancialOverview());
  })
);

financeExtendedRouter.get(
  "/status-breakdown",
  requireRole(...READ_ROLES),
  asyncH(async (_req, res) => {
    res.json(await getShipmentStatusBreakdown());
  })
);
