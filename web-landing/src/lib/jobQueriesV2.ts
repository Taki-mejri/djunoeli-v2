import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export type JobStatus = "ASSIGNED" | "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED" | "FAILED_DELIVERY";

export type Job = {
  id: string;
  trackingNumber: string;
  status: JobStatus | string;
  deliveryType: "SIMPLE" | "EXPRESS" | string;
  receiverName: string;
  receiverPhone: string;
  deliveryCity: string;
  deliveryAddress: string | null;
  isFragile: boolean;
  description: string | null;
  deliveryPrice: number;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  expressPickupAt: string | null;
  slaDeadlineAt: string | null;
  slaBreached: boolean | null;
  // Magasin à ramasser (snapshot expéditeur renvoyé par le backend)
  senderName: string;
  senderPhone: string;
  pickupAddress: string;
  pickupCity: string;
};

/** Réponse des actions livreur : la course mise à jour + un message (FR, serveur) */
export type JobActionResult = {
  shipment: Job;
  message: string;
  isExpress?: boolean;
  slaDeadlineAt?: string | null;
  slaBreached?: boolean | null;
};

export const jobKeys = {
  all: ["jobsV2"] as const,
  detail: (id: string) => ["jobsV2", "detail", id] as const,
};

export function useMyJobs() {
  return useQuery({
    queryKey: jobKeys.all,
    queryFn: async () => (await api.get<Job[]>("/livreur/jobs")).data,
    staleTime: 8_000,
    refetchInterval: 30_000, // rafraîchit pour suivre les chronos / nouvelles assignations
  });
}

/** Ramassage par scan (numéro de suivi) → PICKED_UP */
export function usePickupScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trackingNumber: string) =>
      (await api.post<JobActionResult>("/livreur/pickup", { trackingNumber })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: jobKeys.all }),
  });
}

/** Avancer : OUT_FOR_DELIVERY | DELIVERED | FAILED_DELIVERY */
export function useAdvanceDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: JobStatus; reason?: string }) =>
      (await api.patch<JobActionResult>(`/livreur/jobs/${input.id}/status`, { status: input.status, reason: input.reason })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: jobKeys.all }),
  });
}
