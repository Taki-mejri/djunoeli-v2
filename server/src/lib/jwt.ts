import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { UserRole } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "15m";
const REFRESH_EXPIRES_DAYS = parseInt(process.env.REFRESH_EXPIRES_DAYS || "7", 10);

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET manquant dans .env");
}

export type JwtPayload = {
  sub: string;     // user id
  role: UserRole;
  email: string;
};

/* ------------ ACCESS TOKEN (JWT, court) ------------ */

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/* ------------ REFRESH TOKEN (opaque, long, hashé en DB) ------------ */

/** Génère un refresh token aléatoire de 64 caractères hex */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Hash le refresh token avec SHA-256 (pas bcrypt — pas besoin, c'est déjà aléatoire) */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Date d'expiration du refresh token (7 jours par défaut) */
export function refreshTokenExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_EXPIRES_DAYS);
  return d;
}

/** Pour le cookie HttpOnly */
export function refreshCookieMaxAgeMs(): number {
  return REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000;
}
