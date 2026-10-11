import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

/* =====================================================
   Types
   ===================================================== */

export type LivreurJobStatus =
  | "AWAITING_PICKUP"
  | "PICKED_UP"
  | "AT_WAREHOUSE"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_DELIVERY";

export type LivreurJob = {
  id: string;
  trackingNumber: string;
  status: LivreurJobStatus;
  statusReason: string | null;
  senderName: string;
  pickupAddress: string;
  pickupCity: string;
  receiverName: string;
  receiverPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  description: string | null;
  weight: string | number | null;
  isFragile: boolean;
  codAmount: string | number;
  deliveryType: "STANDARD" | "EXPRESS";
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
};

export type LivreurJobHistoryEntry = {
  id: string;
  status: LivreurJobStatus;
  note: string | null;
  location: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export type LivreurJobDetail = LivreurJob & {
  statusHistory: LivreurJobHistoryEntry[];
};

export type PaginatedJobs = {
  data: LivreurJob[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
};

export type CallOutcome = "ANSWERED" | "NO_ANSWER" | "WRONG_NUMBER" | "RESCHEDULED";

/* =====================================================
   Actions
   ===================================================== */

/**
 * Action suivante possible depuis un statut donné (côté livreur).
 *
 * i18n : ces objets sont des CONSTANTES hors composant, on ne peut donc pas y
 * appeler useTranslation(). On n'y stocke jamais de libellé figé mais une CLÉ
 * i18n (namespace "livreur") ; la traduction se fait au rendu via t(labelKey),
 * ce qui garantit que le bouton suit le changement de langue.
 *
 * Les libellés de statut, eux, ne sont plus stockés ici du tout : le rendu
 * utilise directement tc(`status.${status}`) (namespace "common", qui contient
 * déjà les 10 statuts métier traduits).
 */
export const nextAction: Record<
  LivreurJobStatus,
  { target: LivreurJobStatus; labelKey: string } | null
> = {
  AWAITING_PICKUP: { target: "IN_TRANSIT", labelKey: "actions.start" },
  AT_WAREHOUSE: { target: "IN_TRANSIT", labelKey: "actions.start" },
  PICKED_UP: { target: "IN_TRANSIT", labelKey: "actions.enRoute" },
  IN_TRANSIT: { target: "OUT_FOR_DELIVERY", labelKey: "actions.arrived" },
  OUT_FOR_DELIVERY: { target: "DELIVERED", labelKey: "actions.markDelivered" },
  DELIVERED: null,
  FAILED_DELIVERY: null,
};

/* =====================================================
   Query keys
   ===================================================== */

export const jobKeys = {
  all: ["livreurJobs"] as const,
  list: (status?: string) => ["livreurJobs", "list", status ?? "active"] as const,
  detail: (id: string) => ["livreurJobs", "detail", id] as const,
};

/* =====================================================
   Queries
   ===================================================== */

export function useMyJobs(status?: LivreurJobStatus) {
  return useQuery({
    queryKey: jobKeys.list(status),
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "50" });
      if (status) params.set("status", status);
      const { data } = await api.get<PaginatedJobs>(`/livreur/jobs?${params.toString()}`);
      return data;
    },
    staleTime: 10_000,
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: jobKeys.detail(id ?? ""),
    queryFn: async () => {
      const { data } = await api.get<LivreurJobDetail>(`/livreur/jobs/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 5_000,
  });
}

/* =====================================================
   Mutations
   ===================================================== */

export function useAdvanceJob(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      status: LivreurJobStatus;
      note?: string;
      codCollected?: boolean;
    }) => {
      const { data } = await api.patch(`/livreur/jobs/${id}/status`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

export function useLogCall(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { outcome: CallOutcome; note?: string }) => {
      const { data } = await api.post(`/livreur/jobs/${id}/call`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.detail(id) });
    },
  });
}
