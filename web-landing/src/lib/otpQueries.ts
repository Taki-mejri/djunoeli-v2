import { useMutation } from "@tanstack/react-query";
import { api } from "./api";

export type PhoneShipment = {
  trackingNumber: string;
  status: string;
  destinationCity: string;
  deliveryType: "STANDARD" | "EXPRESS";
  isFragile: boolean;
  createdAt: string;
  deliveredAt: string | null;
};

/** Demande d'OTP (envoi du code) */
export function useRequestOtp() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const { data } = await api.post<{ ok: boolean; message: string; simulated: boolean }>(
        "/public/otp/request",
        { phone }
      );
      return data;
    },
  });
}

/** Vérification d'OTP → renvoie les colis */
export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (input: { phone: string; code: string }) => {
      const { data } = await api.post<{ shipments: PhoneShipment[]; count: number }>(
        "/public/otp/verify",
        input
      );
      return data;
    },
  });
}
