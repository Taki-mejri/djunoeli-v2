import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

/* =====================================================
   Types
   ===================================================== */

export type LivreurBalance = {
  livreurId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string;
  codBalance: number;
  totalDeliveries: number;
  lastSettlementAt: string | null;
};

export type LivreurBalancesResponse = {
  rows: LivreurBalance[];
  summary: { totalToCollect: number; settledThisMonth: number; livreursWithBalance: number };
};

export type ExpediteurCodRow = {
  expediteurId: string;
  companyName: string;
  email: string;
  phone: string | null;
  grossCod: number;
  commission: number;
  netOwed: number;
  shipmentCount: number;
};

export type ExpediteurCodResponse = {
  rows: ExpediteurCodRow[];
  summary: { totalNetOwed: number; totalGross: number; totalCommission: number; expediteursWithBalance: number };
};

export type Invoice = {
  id: string;
  number: string;
  amount: number;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
  companyName: string;
};

export type LivreurSettlement = {
  id: string;
  amount: number;
  method: string | null;
  reference: string | null;
  note: string | null;
  createdAt: string;
  livreurName: string;
  settledByName: string;
};

export type ExpediteurSettlement = {
  id: string;
  grossCod: number;
  commission: number;
  netAmount: number;
  method: string | null;
  reference: string | null;
  createdAt: string;
  companyName: string;
  settledByName: string;
};

export type FinancialOverview = {
  revenue: { total: number; totalDeliveries: number; thisMonth: number; thisMonthDeliveries: number };
  cashPosition: { heldByLivreurs: number; owedToExpediteurs: number; pendingCommission: number };
  invoicing: { unpaidAmount: number; unpaidCount: number; paidThisMonth: number; paidThisMonthCount: number };
};

export type StatusBreakdown = { status: string; count: number }[];

/* =====================================================
   Query keys
   ===================================================== */

export const financeKeys = {
  livreurBalances: ["finance", "livreurBalances"] as const,
  livreurSettlements: ["finance", "livreurSettlements"] as const,
  expediteurCod: ["finance", "expediteurCod"] as const,
  expediteurSettlements: ["finance", "expediteurSettlements"] as const,
  invoices: (status?: string) => ["finance", "invoices", status ?? "all"] as const,
  overview: ["finance", "overview"] as const,
  breakdown: ["finance", "breakdown"] as const,
};

/* =====================================================
   Queries
   ===================================================== */

export function useLivreurBalances() {
  return useQuery({
    queryKey: financeKeys.livreurBalances,
    queryFn: async () => (await api.get<LivreurBalancesResponse>("/finance/livreur-balances")).data,
    staleTime: 15_000,
  });
}

export function useLivreurSettlements() {
  return useQuery({
    queryKey: financeKeys.livreurSettlements,
    queryFn: async () => (await api.get<LivreurSettlement[]>("/finance/livreur-settlements")).data,
    staleTime: 15_000,
  });
}

export function useExpediteurCod() {
  return useQuery({
    queryKey: financeKeys.expediteurCod,
    queryFn: async () => (await api.get<ExpediteurCodResponse>("/finance/expediteur-cod")).data,
    staleTime: 15_000,
  });
}

export function useExpediteurSettlements() {
  return useQuery({
    queryKey: financeKeys.expediteurSettlements,
    queryFn: async () => (await api.get<ExpediteurSettlement[]>("/finance/expediteur-settlements")).data,
    staleTime: 15_000,
  });
}

export function useInvoices(status?: string) {
  return useQuery({
    queryKey: financeKeys.invoices(status),
    queryFn: async () => {
      const q = status ? `?status=${status}` : "";
      return (await api.get<Invoice[]>(`/finance/invoices${q}`)).data;
    },
    staleTime: 15_000,
  });
}

export function useFinancialOverview() {
  return useQuery({
    queryKey: financeKeys.overview,
    queryFn: async () => (await api.get<FinancialOverview>("/finance/overview")).data,
    staleTime: 15_000,
  });
}

export function useStatusBreakdown() {
  return useQuery({
    queryKey: financeKeys.breakdown,
    queryFn: async () => (await api.get<StatusBreakdown>("/finance/status-breakdown")).data,
    staleTime: 30_000,
  });
}

/* =====================================================
   Mutations
   ===================================================== */

export function useSettleLivreur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      livreurId: string;
      amount?: number;
      method?: string;
      reference?: string;
      note?: string;
    }) => (await api.post("/finance/livreur-settle", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.livreurBalances });
      qc.invalidateQueries({ queryKey: financeKeys.livreurSettlements });
      qc.invalidateQueries({ queryKey: financeKeys.overview });
    },
  });
}

export function useSettleExpediteur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      expediteurId: string;
      method?: string;
      reference?: string;
      note?: string;
    }) => (await api.post("/finance/expediteur-settle", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: financeKeys.expediteurCod });
      qc.invalidateQueries({ queryKey: financeKeys.expediteurSettlements });
      qc.invalidateQueries({ queryKey: financeKeys.overview });
    },
  });
}

export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { expediteurId: string; note?: string }) =>
      (await api.post("/finance/invoices/generate", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "invoices"] });
      qc.invalidateQueries({ queryKey: financeKeys.overview });
    },
  });
}

export function usePayInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; method?: string; reference?: string }) =>
      (await api.post(`/finance/invoices/${input.id}/pay`, { method: input.method, reference: input.reference })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "invoices"] });
      qc.invalidateQueries({ queryKey: financeKeys.overview });
    },
  });
}
