import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

/* =====================================================
   Types
   ===================================================== */
export type WalletTxType =
  | "CREDIT_ADMIN" | "DEBIT_SHIPMENT" | "REFUND" | "BONUS" | "TOPUP_CARD";

export type WalletTx = {
  id: string;
  type: WalletTxType | string;
  amount: number;        // >0 crédit, <0 débit
  balanceAfter: number;
  note: string | null;
  shipmentId: string | null;
  createdAt: string;
  byName?: string;
};

export type MyWallet = {
  balance: number;
  firstTopupDone: boolean;
  transactions: WalletTx[];
};

export type WalletRow = {
  expediteurId: string;
  companyName: string;
  email: string;
  balance: number;
  firstTopupDone: boolean;
};

export type WalletDetail = WalletRow & { transactions: WalletTx[] };

export type CreditResult = { companyName: string; newBalance: number; bonusApplied: number; message: string; transactions: WalletTx[] };
export type RefundResult = { companyName: string; newBalance: number; message: string; transaction: WalletTx };

/* =====================================================
   Query keys
   ===================================================== */
export const walletKeys = {
  mine: ["wallet", "me"] as const,
  list: ["wallet", "admin", "list"] as const,
  detail: (id: string) => ["wallet", "admin", "detail", id] as const,
};

/* =====================================================
   Queries
   ===================================================== */
export function useMyWallet() {
  return useQuery({
    queryKey: walletKeys.mine,
    queryFn: async () => (await api.get<MyWallet>("/wallet/me")).data,
    staleTime: 10_000,
  });
}

export function useWallets() {
  return useQuery({
    queryKey: walletKeys.list,
    queryFn: async () => (await api.get<WalletRow[]>("/admin/wallets")).data,
    staleTime: 10_000,
  });
}

export function useWalletDetail(expediteurId: string | undefined) {
  return useQuery({
    queryKey: walletKeys.detail(expediteurId ?? ""),
    queryFn: async () => (await api.get<WalletDetail>(`/admin/wallets/${expediteurId}`)).data,
    enabled: !!expediteurId,
    staleTime: 5_000,
  });
}

/* =====================================================
   Mutations (admin)
   ===================================================== */
export function useCreditWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { expediteurId: string; amount: number; note?: string }) =>
      (await api.post<CreditResult>(`/admin/wallets/${input.expediteurId}/credit`, {
        amount: input.amount, note: input.note,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet", "admin"] });
    },
  });
}

export function useRefundWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { expediteurId: string; amount: number; note?: string; shipmentId?: string }) =>
      (await api.post<RefundResult>(`/admin/wallets/${input.expediteurId}/refund`, {
        amount: input.amount, note: input.note, shipmentId: input.shipmentId,
      })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet", "admin"] });
    },
  });
}
