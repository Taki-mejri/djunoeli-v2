import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

/* =====================================================
   Types
   ===================================================== */

export type ExpectedRow = {
  id: string;
  trackingNumber: string;
  receiverName: string;
  deliveryCity: string;
  isFragile: boolean;
  codAmount: number;
  verified: boolean;
  verifiedAt: string | null;
};

export type ExpectedResponse = {
  warehouseId: string | null;
  rows: ExpectedRow[];
  summary: { expected: number; verified: number; missing: number };
};

export type OpenSession = {
  id: string;
  expectedCount: number;
  verifiedCount: number;
  startedAt: string;
};

export type SessionState = {
  session: {
    id: string;
    status: string;
    expectedCount: number;
    verifiedCount: number;
    missingCount: number;
    note: string | null;
    startedAt: string;
    closedAt: string | null;
  };
  verified: { trackingNumber: string; receiverName: string; deliveryCity: string; verifiedAt: string }[];
  missing: { trackingNumber: string; receiverName: string; deliveryCity: string }[];
};

export type SessionHistoryRow = {
  id: string;
  status: string;
  expectedCount: number;
  verifiedCount: number;
  missingCount: number;
  startedAt: string;
  closedAt: string | null;
  startedByName: string;
};

/* =====================================================
   Query keys
   ===================================================== */
export const invKeys = {
  expected: ["inventory", "expected"] as const,
  current: ["inventory", "current"] as const,
  session: (id: string) => ["inventory", "session", id] as const,
  history: ["inventory", "history"] as const,
};

/* =====================================================
   Queries
   ===================================================== */

export function useExpected() {
  return useQuery({
    queryKey: invKeys.expected,
    queryFn: async () => (await api.get<ExpectedResponse>("/dispatch/inventory/expected")).data,
    staleTime: 5_000,
  });
}

export function useCurrentSession() {
  return useQuery({
    queryKey: invKeys.current,
    queryFn: async () =>
      (await api.get<{ session: OpenSession | null }>("/dispatch/inventory/current")).data,
    staleTime: 5_000,
  });
}

export function useSessionState(id: string | undefined) {
  return useQuery({
    queryKey: invKeys.session(id ?? ""),
    queryFn: async () => (await api.get<SessionState>(`/dispatch/inventory/${id}`)).data,
    enabled: !!id,
    staleTime: 3_000,
  });
}

export function useInventoryHistory() {
  return useQuery({
    queryKey: invKeys.history,
    queryFn: async () => (await api.get<SessionHistoryRow[]>("/dispatch/inventory-history")).data,
    staleTime: 15_000,
  });
}

/* =====================================================
   Mutations
   ===================================================== */

export function useOpenSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note?: string) =>
      (await api.post<{ session: OpenSession; message: string }>("/dispatch/inventory/open", { note })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invKeys.current });
      qc.invalidateQueries({ queryKey: invKeys.expected });
    },
  });
}

export function useScanVerify(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trackingNumber: string) =>
      (await api.post(`/dispatch/inventory/${sessionId}/scan`, { trackingNumber })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invKeys.expected });
      qc.invalidateQueries({ queryKey: invKeys.session(sessionId) });
    },
  });
}

export function useCloseSession(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note?: string) =>
      (await api.post(`/dispatch/inventory/${sessionId}/close`, { note })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invKeys.current });
      qc.invalidateQueries({ queryKey: invKeys.expected });
      qc.invalidateQueries({ queryKey: invKeys.history });
    },
  });
}
