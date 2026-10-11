import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { shipmentKeys } from "./shipmentQueries";
import { walletKeys } from "./walletQueries";

/* Estimation de prix (les 2 types) */
export type PriceEstimate = {
  distanceKm: number;
  geocodeSource: "geocoded" | "quartier_fallback";
  prices: { simple: number; express: number };
  price: number | null;
};

export function useEstimatePrice() {
  return useMutation({
    mutationFn: async (input: { quartier: string; address?: string }) =>
      (await api.post<PriceEstimate>("/pricing/estimate", input)).data,
  });
}

/* Création de colis v2 */
export type CreateShipmentInput = {
  receiverName: string;
  receiverPhone: string;
  deliveryCity: string;      // quartier
  deliveryAddress: string;   // obligatoire
  deliveryType: "SIMPLE" | "EXPRESS";
  isFragile?: boolean;
  description?: string;
};

/** Ce que renvoie le backend (sous-ensemble utile du détail colis). */
export type CreatedShipment = {
  id: string;
  trackingNumber: string;
  deliveryPrice: string | number;
  pickupRound: "today" | "tomorrow" | "express" | null;
};

export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    // Route expéditeur de création (étape 3 backend) : prix recalculé + débit wallet
    mutationFn: async (input: CreateShipmentInput) =>
      (await api.post<CreatedShipment>("/expediteur/shipments", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: walletKeys.mine }); // ["wallet","me"] : solde à jour
      qc.invalidateQueries({ queryKey: shipmentKeys.all }); // la liste affiche le nouveau colis
    },
  });
}
