import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

/* =====================================================
   Types
   ===================================================== */
export type AssignableShipment = {
  id: string;
  trackingNumber: string;
  status: string;
  receiverName: string;
  deliveryCity: string;
  deliveryAddress: string;
  codAmount: number;
  isFragile: boolean;
  currentLivreur: string | null;
};

export type AssignableLivreur = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  vehicleType: string;
  status: string;
};

/* =====================================================
   Query keys
   ===================================================== */
export const remoteKeys = {
  shipments: (search?: string) => ["remoteAssign", "shipments", search ?? ""] as const,
  livreurs: ["remoteAssign", "livreurs"] as const,
};

/* =====================================================
   Queries
   ===================================================== */
export function useAssignableShipments(search?: string) {
  return useQuery({
    queryKey: remoteKeys.shipments(search),
    queryFn: async () => {
      const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      return (await api.get<AssignableShipment[]>(`/remote-assign/shipments${q}`)).data;
    },
    staleTime: 5_000,
  });
}

export function useAssignableLivreurs() {
  return useQuery({
    queryKey: remoteKeys.livreurs,
    queryFn: async () => (await api.get<AssignableLivreur[]>("/remote-assign/livreurs")).data,
    staleTime: 10_000,
  });
}

/* =====================================================
   Mutation
   ===================================================== */
export function useRemoteAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      shipmentId: string;
      livreurId: string;
      confirmed: true;
      reason: string;
    }) => (await api.post("/remote-assign", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["remoteAssign"] });
      // Rafraîchit aussi les listes de colis des dashboards
      qc.invalidateQueries({ queryKey: ["shipments"] });
      qc.invalidateQueries({ queryKey: ["adminShipments"] });
    },
  });
}
