import type { DeliveryType } from "@prisma/client";

const BASE_PRICES: Record<DeliveryType, number> = {
  STANDARD: 8,
  EXPRESS: 12,
};

const FRAGILE_SURCHARGE = 3;

export function getPriceBreakdown(deliveryType: DeliveryType, isFragile: boolean) {
  const base = BASE_PRICES[deliveryType];
  const fragile = isFragile ? FRAGILE_SURCHARGE : 0;
  return { base, fragile, total: base + fragile };
}
