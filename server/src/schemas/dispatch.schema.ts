import { z } from "zod";

export const assignLivreurSchema = z.object({
  livreurId: z.string().cuid("livreurId invalide"),
  note: z.string().max(200).optional(),
});
export type AssignLivreurInput = z.infer<typeof assignLivreurSchema>;

export const unassignSchema = z.object({
  reason: z.string().max(200).optional(),
});
export type UnassignInput = z.infer<typeof unassignSchema>;
