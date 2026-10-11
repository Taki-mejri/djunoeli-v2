import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

/* =====================================================
   Types
   ===================================================== */

export type DispatcherWarehouse = {
  id: string;
  name: string;
  city: string;
  address: string;
};

export type DispatcherProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  warehouseId: string | null;
  warehouse: DispatcherWarehouse | null;
};

export type DispatcherStats = {
  dispatcher: DispatcherProfile;
  today: { received: number; sorted: number; assigned: number };
  overall: { atWarehouseTotal: number };
};

export type ScanResultShipment = {
  id: string;
  trackingNumber: string;
  status: string;
  deliveryCity: string;
  receiverName: string;
  receiverPhone?: string;
  isFragile: boolean;
  deliveryType: "STANDARD" | "EXPRESS";
  codAmount?: string | number;
  livreurId?: string | null;
  expediteur?: { companyName: string };
};

export type ScanReceiveResult = {
  shipment: ScanResultShipment;
  nextStep: string;
};

export type ScanSortResult = {
  shipment: ScanResultShipment;
  matchesDestination: boolean;
  nextStep: string;
};

export type ScanAssignResult = {
  shipment: ScanResultShipment;
  livreurName: string;
  nextStep: string;
};

export type ScanHistoryEntry = {
  id: string;
  status: string;
  note: string | null;
  location: string | null;
  createdAt: string;
  shipment: {
    id: string;
    trackingNumber: string;
    deliveryCity: string;
    receiverName: string;
    isFragile: boolean;
  };
};

export type AssignableLivreur = {
  id: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  rating: number | null;
  vehicleType: string;
  vehiclePlate: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  activeCount: number;
};

/* =====================================================
   Query keys
   ===================================================== */

export const dispatchKeys = {
  me: ["dispatch", "me"] as const,
  scans: (eventType?: string) => ["dispatch", "scans", eventType ?? "all"] as const,
  livreurs: ["dispatch", "livreurs"] as const,
};

/* =====================================================
   Queries
   ===================================================== */

export function useDispatcherStats() {
  return useQuery({
    queryKey: dispatchKeys.me,
    queryFn: async () => {
      const { data } = await api.get<DispatcherStats>("/dispatch/me");
      return data;
    },
    staleTime: 15_000,
  });
}

export function useScanHistory(eventType?: "RECEIVE" | "SORT" | "ASSIGN", limit = 30) {
  return useQuery({
    queryKey: dispatchKeys.scans(eventType),
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (eventType) params.set("eventType", eventType);
      const { data } = await api.get<{ dispatcher: DispatcherProfile; entries: ScanHistoryEntry[] }>(
        `/dispatch/scans?${params.toString()}`
      );
      return data;
    },
    staleTime: 10_000,
  });
}

export function useAssignableLivreurs() {
  return useQuery({
    queryKey: dispatchKeys.livreurs,
    queryFn: async () => {
      const { data } = await api.get<AssignableLivreur[]>("/dispatch/livreurs");
      return data;
    },
    staleTime: 20_000,
  });
}

/* =====================================================
   Mutations — les 3 scans
   ===================================================== */

export function useScanReceive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { trackingNumber: string; zone?: string; note?: string }) => {
      const { data } = await api.post<ScanReceiveResult>("/dispatch/scan/receive", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dispatchKeys.me });
      qc.invalidateQueries({ queryKey: ["dispatch", "scans"] });
    },
  });
}

export function useScanSort() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      trackingNumber: string;
      destinationGovernorate: string;
      note?: string;
    }) => {
      const { data } = await api.post<ScanSortResult>("/dispatch/scan/sort", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dispatchKeys.me });
      qc.invalidateQueries({ queryKey: ["dispatch", "scans"] });
    },
  });
}

export function useScanAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { trackingNumber: string; livreurId: string; note?: string }) => {
      const { data } = await api.post<ScanAssignResult>("/dispatch/scan/assign", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dispatchKeys.me });
      qc.invalidateQueries({ queryKey: ["dispatch", "scans"] });
      qc.invalidateQueries({ queryKey: dispatchKeys.livreurs });
    },
  });
}
