import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "./api";

/* ===========================
   TYPES (miroir du backend)
   =========================== */

export type DeliveryType = "STANDARD" | "EXPRESS";

export type ShipmentStatus =
  | "PENDING"
  | "ASSIGNED" // v2 : assigné par l'admin, pas encore ramassé
  | "AWAITING_PICKUP"
  | "PICKED_UP"
  | "AT_WAREHOUSE"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_DELIVERY"
  | "RETURNED"
  | "CANCELLED";

export type ShipmentDTO = {
  id: string;
  trackingNumber: string;
  expediteurId: string;
  expediteur: {
    id: string;
    companyName: string;
    user: { email: string; phone: string | null };
  };
  livreurId: string | null;
  livreur: {
    id: string;
    user: { firstName: string | null; lastName: string | null; phone: string | null };
  } | null;
  senderName: string;
  senderPhone: string;
  pickupAddress: string;
  pickupCity: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail: string | null;
  deliveryAddress: string;
  deliveryCity: string;
  description: string | null;
  weight: string;
  dimensions: string | null;
  isFragile: boolean;
  deliveryType: DeliveryType;
  deliveryPrice: string; // Decimal en string
  codAmount: string;
  insuranceFee: string;
  status: ShipmentStatus;
  statusReason: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  expectedDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentStatusHistoryEntry = {
  id: string;
  status: ShipmentStatus;
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

export type ShipmentWithHistory = ShipmentDTO & {
  statusHistory: ShipmentStatusHistoryEntry[];
};

export type Paginated<T> = {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export type ListShipmentsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  status?: ShipmentStatus;
  city?: string;
  expediteurId?: string;
  livreurId?: string;
  dateFrom?: string; // ISO date
  dateTo?: string;
};

export type CreateShipmentInput = {
  expediteurId?: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail?: string;
  deliveryAddress: string;
  deliveryCity: string;
  pickupAddress?: string;
  pickupCity?: string;
  description?: string;
  isFragile?: boolean;
  deliveryType: DeliveryType;
  codAmount?: number;
};

/* ===========================
   QUERY KEYS
   =========================== */

export const shipmentKeys = {
  all: ["shipments"] as const,
  adminList: (params: ListShipmentsParams) => ["shipments", "admin", "list", params] as const,
  adminDetail: (id: string) => ["shipments", "admin", "detail", id] as const,
  myList: (params: ListShipmentsParams) => ["shipments", "mine", "list", params] as const,
  myDetail: (id: string) => ["shipments", "mine", "detail", id] as const,
};

/* ===========================
   ADMIN HOOKS
   =========================== */

export function useAdminShipments(params: ListShipmentsParams = {}) {
  return useQuery({
    queryKey: shipmentKeys.adminList(params),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ShipmentDTO>>("/admin/shipments", { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminShipment(id: string | undefined) {
  return useQuery({
    queryKey: id ? shipmentKeys.adminDetail(id) : ["shipments", "admin", "detail", "none"],
    queryFn: async () => {
      const { data } = await api.get<ShipmentWithHistory>(`/admin/shipments/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/* ===========================
   EXPEDITEUR HOOKS
   =========================== */

export function useMyShipments(params: ListShipmentsParams = {}) {
  return useQuery({
    queryKey: shipmentKeys.myList(params),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ShipmentDTO>>("/expediteur/shipments", { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useMyShipment(id: string | undefined) {
  return useQuery({
    queryKey: id ? shipmentKeys.myDetail(id) : ["shipments", "mine", "detail", "none"],
    queryFn: async () => {
      const { data } = await api.get<ShipmentWithHistory>(`/expediteur/shipments/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateMyShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateShipmentInput) => {
      const { data } = await api.post<ShipmentDTO>("/expediteur/shipments", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shipmentKeys.all });
    },
  });
}

/* ===========================
   HELPERS d'affichage
   =========================== */

/*
 * Les LIBELLÉS de statut ne vivent plus ici : ils sont traduits au rendu via
 * tc(`status.${status}`) (namespace common), comme pour les autres espaces.
 * Seul le ton (couleur du badge) reste une donnée de présentation figée.
 */
export const shipmentStatusTone: Record<ShipmentStatus, "blue" | "amber" | "green" | "red" | "gray" | "teal"> = {
  PENDING: "gray",
  ASSIGNED: "amber",
  AWAITING_PICKUP: "amber",
  PICKED_UP: "blue",
  AT_WAREHOUSE: "blue",
  IN_TRANSIT: "amber",
  OUT_FOR_DELIVERY: "teal",
  DELIVERED: "green",
  FAILED_DELIVERY: "red",
  RETURNED: "red",
  CANCELLED: "red",
};
