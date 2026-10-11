import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "./api";

/* ===========================
   TYPES (miroir du backend)
   =========================== */

export type ExpediteurDTO = {
  id: string;
  companyName: string;
  contactPerson: string | null;
  taxNumber: string | null;
  businessAddress: string | null;
  city: string | null;
  postalCode: string | null;
  pickupAddress: string | null;
  pickupCity: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  balance: string; // Prisma Decimal arrive en string
  creditLimit: string;
  pricingPlanId: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    phone: string | null;
    status: "ACTIVE" | "SUSPENDED" | "PENDING";
    lastLoginAt: string | null;
  };
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export type ListExpediteursParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  status?: "ACTIVE" | "SUSPENDED" | "PENDING";
  city?: string;
};

export type CreateExpediteurInput = {
  email: string;
  password: string;
  phone?: string;
  companyName: string;
  contactPerson?: string;
  taxNumber?: string;
  businessAddress?: string;
  city?: string;
  postalCode?: string;
  pickupAddress?: string;
  pickupCity?: string;
};

export type UpdateExpediteurInput = Partial<
  Omit<CreateExpediteurInput, "email" | "password">
> & {
  status?: "ACTIVE" | "SUSPENDED" | "PENDING";
};

/* ===========================
   QUERY KEYS (factory)
   =========================== */

export const expediteurKeys = {
  all: ["expediteurs"] as const,
  list: (params: ListExpediteursParams) => ["expediteurs", "list", params] as const,
  detail: (id: string) => ["expediteurs", "detail", id] as const,
};

/* ===========================
   HOOKS — LIST
   =========================== */

export function useExpediteurs(params: ListExpediteursParams = {}) {
  return useQuery({
    queryKey: expediteurKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ExpediteurDTO>>("/admin/expediteurs", {
        params,
      });
      return data;
    },
    placeholderData: keepPreviousData, // pagination fluide sans flash
  });
}

/* ===========================
   HOOKS — GET ONE
   =========================== */

export function useExpediteur(id: string | undefined) {
  return useQuery({
    queryKey: id ? expediteurKeys.detail(id) : ["expediteurs", "detail", "none"],
    queryFn: async () => {
      const { data } = await api.get<ExpediteurDTO>(`/admin/expediteurs/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/* ===========================
   HOOKS — CREATE / UPDATE / DELETE
   =========================== */

export function useCreateExpediteur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExpediteurInput) => {
      const { data } = await api.post<ExpediteurDTO>("/admin/expediteurs", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expediteurKeys.all });
    },
  });
}

export function useUpdateExpediteur(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateExpediteurInput) => {
      const { data } = await api.patch<ExpediteurDTO>(`/admin/expediteurs/${id}`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expediteurKeys.all });
    },
  });
}

export function useDeleteExpediteur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/expediteurs/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expediteurKeys.all });
    },
  });
}

/* ===========================
   HOOK — Expediteur self (son propre profil)
   =========================== */

export function useMyExpediteurProfile() {
  return useQuery({
    queryKey: ["expediteur", "me"],
    queryFn: async () => {
      const { data } = await api.get<ExpediteurDTO>("/expediteur/me");
      return data;
    },
  });
}
