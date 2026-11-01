import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

/* =====================================================
   Types
   ===================================================== */
export type PublicStep = {
  /** Flux v2 ; la dernière étape peut être remplacée par un état terminal */
  key:
    | "PENDING" | "ASSIGNED" | "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED"
    | "CANCELLED" | "FAILED_DELIVERY" | "RETURNED";
  reached: boolean;
  current: boolean;
  terminal: boolean;
  at: string | null;
};

export type PublicTracking = {
  trackingNumber: string;
  status: string;
  destinationCity: string;
  deliveryType: "STANDARD" | "EXPRESS";
  isFragile: boolean;
  createdAt: string;
  deliveredAt: string | null;
  special: "FAILED" | "CANCELLED" | "RETURNED" | null;
  steps: PublicStep[];
};

/* =====================================================
   Query — suivi public (pas d'auth)
   enabled seulement quand un numéro est fourni
   ===================================================== */
export function usePublicTracking(trackingNumber: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["publicTracking", trackingNumber],
    queryFn: async () => {
      const { data } = await api.get<PublicTracking>(
        `/public/track/${encodeURIComponent(trackingNumber!.trim())}`
      );
      return data;
    },
    enabled: enabled && !!trackingNumber && trackingNumber.trim().length >= 3,
    retry: false,
    staleTime: 30_000,
  });
}
