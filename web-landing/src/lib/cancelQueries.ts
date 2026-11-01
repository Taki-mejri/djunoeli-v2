import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export type CancelResult = {
  trackingNumber: string;
  refundAmount: number;
  tierPercent: number;
  newBalance: number | null;
  message?: string;
};

/**
 * Annulation d'un colis.
 * - asAdmin=false → route expéditeur (POST /expediteur/shipments/:id/cancel), limitée avant ramassage.
 * - asAdmin=true  → route admin (POST /admin/shipments/:id/cancel), tous statuts non terminaux.
 */
export function useCancelShipment(asAdmin = false) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { shipmentId: string; reason?: string }) => {
      const url = asAdmin
        ? `/admin/shipments/${input.shipmentId}/cancel`
        : `/expediteur/shipments/${input.shipmentId}/cancel`;
      return (await api.post<CancelResult>(url, { reason: input.reason })).data;
    },
    onSuccess: () => {
      // Rafraîchit les listes impactées (colis + wallet + assignation)
      qc.invalidateQueries({ queryKey: ["shipments"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["dispatch"] });
    },
  });
}
