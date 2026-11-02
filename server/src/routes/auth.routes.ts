import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  refreshCookieMaxAgeMs,
} from "../lib/jwt.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
import { asyncH, badRequest, unauthorized } from "../middleware/errorHandler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/* =====================================================
   RATE LIMITERS — protègent contre les attaques brute force
   ===================================================== */

// Login : 5 tentatives par IP par 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: { code: "TOO_MANY_REQUESTS", message: "Trop de tentatives. Réessayez dans 15 minutes." },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register : 10 comptes par IP par heure
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: { code: "TOO_MANY_REQUESTS", message: "Trop d'inscriptions. Réessayez dans une heure." },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Refresh : 30 par 15 min (utilisé souvent en usage normal)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

/* =====================================================
   HELPERS
   ===================================================== */

const REFRESH_COOKIE = "djunoeli_refresh";

/** Options du cookie HttpOnly */
const refreshCookieOptions = () => ({
  httpOnly: true,
  // HTTPS only en prod, sauf COOKIE_SECURE=false (démo HTTP en IP:port)
  secure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: refreshCookieMaxAgeMs(),
  path: "/api/v1/auth", // limité aux routes d'auth
});

/** Crée un refresh token, le stocke hashé en DB, renvoie le token brut */
async function issueRefreshToken(userId: string, userAgent?: string, ip?: string) {
  const token = generateRefreshToken();
  const tokenHash = hashRefreshToken(token);
  const expiresAt = refreshTokenExpiry();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: userAgent?.slice(0, 255),
      ipAddress: ip?.slice(0, 64),
    },
  });

  return token;
}

/** Forme l'objet user à renvoyer au front (jamais le passwordHash) */
function publicUser(u: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
}) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    status: u.status,
  };
}

/* =====================================================
   POST /auth/register
   ===================================================== */

router.post(
  "/register",
  registerLimiter,
  asyncH(async (req, res) => {
    const data = registerSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw badRequest("Cet email est déjà utilisé");

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
      },
    });

    res.status(201).json({
      message: "Compte créé avec succès",
      user: publicUser(user),
    });
  })
);

/* =====================================================
   POST /auth/login
   ===================================================== */

router.post(
  "/login",
  loginLimiter,
  asyncH(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Message volontairement vague pour ne pas révéler si l'email existe
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw unauthorized("Email ou mot de passe incorrect");
    }
    if (user.status === "SUSPENDED") {
      throw unauthorized("Compte suspendu");
    }

    // Met à jour lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Émet les tokens
    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const refreshToken = await issueRefreshToken(
      user.id,
      req.headers["user-agent"],
      req.ip
    );

    // Refresh token dans un cookie HttpOnly (le front ne le voit jamais)
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());

    res.json({
      accessToken,
      user: publicUser(user),
    });
  })
);

/* =====================================================
   POST /auth/refresh
   ===================================================== */

router.post(
  "/refresh",
  refreshLimiter,
  asyncH(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw unauthorized("Refresh token manquant");

    const tokenHash = hashRefreshToken(token);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw unauthorized("Refresh token invalide");
    }
    if (stored.user.status === "SUSPENDED") {
      throw unauthorized("Compte suspendu");
    }

    // Rotation : on révoque l'ancien refresh token et on en émet un nouveau
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const newRefreshToken = await issueRefreshToken(
      stored.user.id,
      req.headers["user-agent"],
      req.ip
    );

    const accessToken = signAccessToken({
      sub: stored.user.id,
      role: stored.user.role,
      email: stored.user.email,
    });

    res.cookie(REFRESH_COOKIE, newRefreshToken, refreshCookieOptions());
    res.json({ accessToken });
  })
);

/* =====================================================
   POST /auth/logout
   ===================================================== */

router.post(
  "/logout",
  asyncH(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) {
      const tokenHash = hashRefreshToken(token);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revoked: false },
        data: { revoked: true },
      });
    }
    res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
    res.json({ message: "Déconnexion réussie" });
  })
);

/* =====================================================
   GET /auth/me  (protégée)
   ===================================================== */

router.get(
  "/me",
  requireAuth,
  asyncH(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw unauthorized();
    res.json({ user });
  })
);

export default router;

