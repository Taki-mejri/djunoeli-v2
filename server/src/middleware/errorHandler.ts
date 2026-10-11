import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

/**
 * Erreur applicative typée : status HTTP + code court + message.
 * Throw une AppError partout dans le code, le handler s'occupe du reste.
 */
export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Helpers raccourcis */
export const badRequest = (msg: string, details?: unknown) =>
  new AppError(400, "BAD_REQUEST", msg, details);
export const unauthorized = (msg = "Non autorisé") =>
  new AppError(401, "UNAUTHORIZED", msg);
export const forbidden = (msg = "Accès refusé") =>
  new AppError(403, "FORBIDDEN", msg);
export const notFound = (msg = "Ressource introuvable") =>
  new AppError(404, "NOT_FOUND", msg);
export const conflict = (msg: string) => new AppError(409, "CONFLICT", msg);
export const tooManyRequests = (msg = "Trop de requêtes") =>
  new AppError(429, "TOO_MANY_REQUESTS", msg);

/**
 * Wrapper async pour Express : évite d'écrire try/catch dans chaque route.
 *   router.post("/x", asyncH(async (req, res) => { ... }));
 */
export const asyncH =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/** Le handler global — toujours en DERNIER dans la chaîne Express */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  // 1) Erreurs de validation Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Données invalides",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
  }

  // 2) Erreurs Prisma connues
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      // Unique constraint failed
      const field = (err.meta?.target as string[] | undefined)?.join(", ") ?? "champ";
      return res.status(409).json({
        error: {
          code: "ALREADY_EXISTS",
          message: `Un enregistrement avec ce ${field} existe déjà.`,
        },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ressource introuvable." },
      });
    }
  }

  // 3) Nos AppErrors
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // 4) Tout le reste → 500 (jamais de stack trace au client en prod)
  console.error("[ERROR]", err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Erreur serveur." },
  });
}
