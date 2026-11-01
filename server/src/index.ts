import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import { adminExpediteursRouter, expediteurSelfRouter } from "./routes/expediteur.routes.js";
import { adminLivreursRouter, livreurSelfRouter } from "./routes/livreur.routes.js";
import { adminShipmentsRouter, expediteurShipmentsRouter } from "./routes/shipment.routes.js";
import { adminDispatchRouter, adminDispatchReadRouter, livreurJobsRouter, livreurPickupRouter } from "./routes/dispatch.routes.js";
import { dispatcherRouter } from "./routes/dispatcher.routes.js";
import { inventoryRouter, inventoryHistoryRouter } from "./routes/inventory.routes.js";
import { remoteAssignRouter } from "./routes/remoteAssign.routes.js";
import { financeRouter, livreurCodRouter } from "./routes/codSettlement.routes.js";
import { financeExtendedRouter } from "./routes/financeExtended.routes.js";
import { publicRouter } from "./routes/publicTrack.routes.js";
import { otpRouter } from "./routes/otp.routes.js";
import { pricingRouter } from "./routes/pricing.routes.js";
import { walletRouter, adminWalletRouter } from "./routes/wallet.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 4002;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", service: "djunoeli-api", timestamp: new Date().toISOString() });
});

// ---- PUBLIC (SANS AUTH) ----
// Suivi public d'un colis : /api/v1/public/track/:trackingNumber
// Monte AVANT les routers metier. Aucun middleware d'auth global n'est
// applique sur /api/v1 (chaque router porte son propre requireAuth), donc
// ce router reste bien accessible sans authentification.
// OTP (suivi par telephone) — public lui aussi, monte AVANT publicRouter
// pour que /public/otp/* ne soit pas capte par le 404 du router parent.
app.use("/api/v1/public/otp", otpRouter);
app.use("/api/v1/public", publicRouter);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin/expediteurs", adminExpediteursRouter);
app.use("/api/v1/expediteur", expediteurSelfRouter);
app.use("/api/v1/admin/livreurs", adminLivreursRouter);
app.use("/api/v1/livreur", livreurSelfRouter);
app.use("/api/v1/admin/shipments", adminShipmentsRouter);
app.use("/api/v1/expediteur/shipments", expediteurShipmentsRouter);

// Dispatch (assign/unassign/suggest + livreur jobs)
app.use("/api/v1/admin/shipments", adminDispatchRouter);
app.use("/api/v1/admin/dispatch", adminDispatchReadRouter);
app.use("/api/v1/livreur/jobs", livreurJobsRouter);
app.use("/api/v1/livreur/pickup", livreurPickupRouter);
// Assignation à distance (partagé admin + dispatcher) — monté avant /dispatch par cohérence d'ordre
app.use("/api/v1/remote-assign", remoteAssignRouter);
app.use("/api/v1/dispatch/inventory", inventoryRouter);
app.use("/api/v1/dispatch/inventory-history", inventoryHistoryRouter);
app.use("/api/v1/dispatch", dispatcherRouter);
app.use("/api/v1/finance", financeRouter);
app.use("/api/v1/finance", financeExtendedRouter);
app.use("/api/v1/livreur/cod", livreurCodRouter);
app.use("/api/v1/pricing", pricingRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/admin/wallets", adminWalletRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route introuvable" } });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Djunoeli API démarré sur http://localhost:${PORT}`);
  console.log(`   Health      : GET    /api/v1/health`);
  console.log(`   Public      : GET    /api/v1/public/track/:trackingNumber (sans auth)`);
  console.log(`   OTP public  : POST   /api/v1/public/otp/{request,verify} (sans auth)`);
  console.log(`   Auth        : POST   /api/v1/auth/{register,login,refresh,logout}`);
  console.log(`   Expediteurs : CRUD   /api/v1/admin/expediteurs`);
  console.log(`   Livreurs    : CRUD   /api/v1/admin/livreurs`);
  console.log(`   Shipments   : CRUD   /api/v1/admin/shipments`);
  console.log(`   Dispatch    : POST   /admin/shipments/:id/{assign,unassign}`);
  console.log(`   Zuweisung   : GET    /admin/dispatch/{shipments,livreurs}`);
  console.log(`   Livraison v2: GET    /livreur/jobs · POST /livreur/pickup · PATCH /livreur/jobs/:id/status`);
  console.log(`   Dispatcher  : POST   /dispatch/scan/{receive,sort,assign}`);
  console.log(`   Inventaire  : GET    /dispatch/inventory/{expected,current,:id} · POST /open,:id/scan,:id/close`);
  console.log(`   Remote      : GET    /remote-assign/shipments · POST /remote-assign`);
  console.log(`   Finance     : GET    /finance/livreur-balances · POST /livreur-settle`);
  console.log(`   Pricing     : POST   /api/v1/pricing/estimate { quartier, address?, type? }`);
  console.log(`   Wallet      : GET    /api/v1/wallet/me · admin: GET /admin/wallets[/:id] · POST /:id/{credit,refund}`);
  console.log(`   Self exp.   : GET    /api/v1/expediteur/me  · CRUD /shipments`);
  console.log(`   Self liv.   : GET    /api/v1/livreur/me     · GET /jobs`);
});
