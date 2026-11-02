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
import { financeRouter, livreurCodRouter } from "./routes/codSettlement.routes.js";
import { financeExtendedRouter } from "./routes/financeExtended.routes.js";
import { publicRouter } from "./routes/publicTrack.routes.js";
import { otpRouter } from "./routes/otp.routes.js";
import { pricingRouter } from "./routes/pricing.routes.js";
import { walletRouter, adminWalletRouter } from "./routes/wallet.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 4002;
const IS_PROD = process.env.NODE_ENV === "production";

// CORS : CORS_ORIGIN (prod, liste séparée par des virgules) + CLIENT_ORIGIN (legacy).
// En dev, les fronts locaux (5173 v1 / 5174 v2) restent autorisés.
const DEV_ORIGINS = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"];
const ALLOWED_ORIGINS = new Set(
  [process.env.CORS_ORIGIN, process.env.CLIENT_ORIGIN]
    .flatMap((v) => (v ?? "").split(","))
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean)
    .concat(IS_PROD ? [] : DEV_ORIGINS),
);

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // Pas d'Origin (curl, healthcheck, même origine) → autorisé
      if (!origin || ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }),
);
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
  console.log(`   CORS origins: ${[...ALLOWED_ORIGINS].join(", ") || "(aucune)"}`);
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
  console.log(`   Finance     : GET    /finance/livreur-balances · POST /livreur-settle`);
  console.log(`   Pricing     : POST   /api/v1/pricing/estimate { quartier, address?, type? }`);
  console.log(`   Wallet      : GET    /api/v1/wallet/me · admin: GET /admin/wallets[/:id] · POST /:id/{credit,refund}`);
  console.log(`   Self exp.   : GET    /api/v1/expediteur/me  · CRUD /shipments`);
  console.log(`   Self liv.   : GET    /api/v1/livreur/me     · GET /jobs`);
});
