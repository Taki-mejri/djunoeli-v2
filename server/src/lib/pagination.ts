import { z } from "zod";

/**
 * Helper réutilisable pour TOUTES les routes de listing.
 * Donne la même API de pagination partout (?page=1&pageSize=20&search=...&sort=...)
 */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  sort: z.string().max(40).optional(), // ex: "createdAt:desc"
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

/** Convertit ?sort=createdAt:desc → { createdAt: 'desc' } pour Prisma */
export function parseSort(
  sort: string | undefined,
  allowedFields: string[],
  fallback: Record<string, "asc" | "desc"> = { createdAt: "desc" }
): Record<string, "asc" | "desc"> {
  if (!sort) return fallback;
  const [field, dir] = sort.split(":");
  if (!field || !allowedFields.includes(field)) return fallback;
  return { [field]: dir === "asc" ? "asc" : "desc" };
}

/** Format de réponse standard pour les listes paginées */
export type Paginated<T> = {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function makePaginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): Paginated<T> {
  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
