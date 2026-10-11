import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@prisma/client";
import { verifyAccessToken, type JwtPayload } from "../lib/jwt.js";
import { unauthorized, forbidden } from "./errorHandler.js";

/**
 * Étend le type Request d'Express pour y ajouter req.user après auth.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Vérifie le header "Authorization: Bearer <token>".
 * Si OK → req.user contient { sub, role, email } et next().
 * Si KO → 401.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(unauthorized("Token manquant"));
  }
  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return next(unauthorized("Token invalide ou expiré"));
  }
}

/**
 * Vérifie que l'utilisateur a un rôle parmi ceux fournis.
 * À utiliser APRÈS requireAuth.
 *   router.get("/admin/users", requireAuth, requireRole("SUPER_ADMIN"), ...);
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden("Vous n'avez pas la permission pour cette action"));
    }
    next();
  };
}
