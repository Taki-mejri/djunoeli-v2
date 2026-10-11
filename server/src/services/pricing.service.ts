import { HUB, haversineKm, type Quartier } from "../lib/dortmundGeo.js";
import { priceBreakdown, priceForDistance, type DeliveryType } from "../lib/pricing.js";
import { geocodeDelivery } from "./geocode.service.js";

/**
 * Estime le prix d'une livraison à partir du quartier + adresse.
 * Géocode (avec fallback quartier), calcule la distance au hub, applique la grille.
 */
export async function estimatePrice(input: {
  quartier: Quartier;
  address?: string;
  type?: DeliveryType; // si fourni, on renvoie aussi le prix de CE type
}) {
  const { coords, source } = await geocodeDelivery(input.address ?? "", input.quartier);
  const distanceKm = haversineKm(HUB, coords);
  const breakdown = priceBreakdown(distanceKm);

  return {
    distanceKm: breakdown.distanceKm,
    geocodeSource: source, // "geocoded" | "quartier_fallback"
    prices: { simple: breakdown.simple, express: breakdown.express },
    // prix du type demandé (si fourni) — c'est celui qui sera débité
    price: input.type ? priceForDistance(distanceKm, input.type) : null,
  };
}
