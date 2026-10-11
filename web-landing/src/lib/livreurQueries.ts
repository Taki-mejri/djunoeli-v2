import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "./api";

/* ===========================
   TYPES (miroir backend)
   =========================== */

export type VehicleType = "MOTO" | "VOITURE" | "CAMIONNETTE" | "CAMION";
export type LivreurStatus = "AVAILABLE" | "BUSY" | "OFFLINE";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

export type LivreurDTO = {
  id: string;
  cin: string | null;
  vehicleType: VehicleType;
  vehiclePlate: string | null;
  zoneId: string | null;
  status: LivreurStatus;
  rating: number;
  totalDeliveries: number;
  successRate: number;
  codBalance: string; // Decimal en string
  currentLat: number | null;
  currentLng: number | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    status: UserStatus;
    lastLoginAt: string | null;
  };
  zone: { id: string; name: string } | null;
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export type ListLivreursParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  status?: UserStatus;
  livreurStatus?: LivreurStatus;
  vehicleType?: VehicleType;
  zoneId?: string;
};

export type CreateLivreurInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  cin?: string;
  vehicleType: VehicleType;
  vehiclePlate?: string;
  zoneId?: string;
};

export type UpdateLivreurInput = Partial<Omit<CreateLivreurInput, "email" | "password">> & {
  status?: UserStatus;
  livreurStatus?: LivreurStatus;
};

/* ===========================
   QUERY KEYS
   =========================== */

export const livreurKeys = {
  all: ["livreurs"] as const,
  list: (params: ListLivreursParams) => ["livreurs", "list", params] as const,
  detail: (id: string) => ["livreurs", "detail", id] as const,
  me: ["livreur", "me"] as const,
};

/* ===========================
   ADMIN HOOKS
   =========================== */

export function useLivreurs(params: ListLivreursParams = {}) {
  return useQuery({
    queryKey: livreurKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<Paginated<LivreurDTO>>("/admin/livreurs", { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useLivreur(id: string | undefined) {
  return useQuery({
    queryKey: id ? livreurKeys.detail(id) : ["livreurs", "detail", "none"],
    queryFn: async () => {
      const { data } = await api.get<LivreurDTO>(`/admin/livreurs/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateLivreur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLivreurInput) => {
      const { data } = await api.post<LivreurDTO>("/admin/livreurs", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: livreurKeys.all });
    },
  });
}

export function useUpdateLivreur(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateLivreurInput) => {
      const { data } = await api.patch<LivreurDTO>(`/admin/livreurs/${id}`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: livreurKeys.all });
    },
  });
}

export function useDeleteLivreur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/livreurs/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: livreurKeys.all });
    },
  });
}

/* ===========================
   SELF (livreur connecté)
   =========================== */

export function useMyLivreurProfile() {
  return useQuery({
    queryKey: livreurKeys.me,
    queryFn: async () => {
      const { data } = await api.get<LivreurDTO>("/livreur/me");
      return data;
    },
  });
}

export function useToggleMyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: "AVAILABLE" | "OFFLINE") => {
      const { data } = await api.patch<LivreurDTO>("/livreur/me/status", { status });
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(livreurKeys.me, data); // mise à jour optimiste immédiate
    },
  });
}
