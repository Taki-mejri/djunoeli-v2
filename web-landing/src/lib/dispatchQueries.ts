import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

/* =====================================================
   Types
   ===================================================== */
export type DeliveryType = "SIMPLE" | "EXPRESS";
export type PickupRound = "today" | "tomorrow" | "express";

export type AssignLivreurRef = { id: string; name: string };

export type AssignableShipment = {
  id: string;
  trackingNumber: string;
  status: string; // PENDING | ASSIGNED
  deliveryType: DeliveryType | string;
  isFragile: boolean;
  deliveryCity: string;
  deliveryAddress: string | null;
  deliveryPrice: number | null;
  plannedPickupDate: string | null;
  pickupRound: PickupRound | string | null;
  assignedAt: string | null;
  createdAt: string;
  storeName: string;
  storePhone: string | null;
  livreur: AssignLivreurRef | null;
};

export type LivreurRow = {
  id: string;
  name: string;
  status: string; // AVAILABLE | BUSY | OFFLINE ...
  activeJobs: number;
};

/* =====================================================
   Query keys
   ===================================================== */
export const dispatchKeys = {
  shipments: ["dispatch", "shipments"] as const,
  livreurs: ["dispatch", "livreurs"] as const,
};

/* =====================================================
   Queries
   ===================================================== */
export function useAssignableShipments() {
  return useQuery({
    queryKey: dispatchKeys.shipments,
    queryFn: async () => (await api.get<AssignableShipment[]>("/admin/dispatch/shipments")).data,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}

export function useLivreurs() {
  return useQuery({
    queryKey: dispatchKeys.livreurs,
    queryFn: async () => (await api.get<LivreurRow[]>("/admin/dispatch/livreurs")).data,
    staleTime: 10_000,
  });
}

/* =====================================================
   Mutation — assigner un colis à un livreur
   ===================================================== */
export function useAssignShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { shipmentId: string; livreurId: string }) =>
      (await api.post(`/admin/shipments/${input.shipmentId}/assign`, { livreurId: input.livreurId })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dispatchKeys.shipments });
      qc.invalidateQueries({ queryKey: dispatchKeys.livreurs });
    },
  });
}
