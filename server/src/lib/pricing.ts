/**
 * Moteur de pricing à la distance — Djunoeli Dortmund.
 *
 * Simple  : 8 € sous 8 km, monte linéairement jusqu'à 16 € à 50 km.
 * Express : 30 € sous 8 km, monte linéairement jusqu'à 35 € à 50 km.
 *
 * Au-delà de 50 km → prix max (plafonné). Sous 8 km → prix plancher.
 */

export type DeliveryType = "SIMPLE" | "EXPRESS";

/** Bornes du modèle (km). */
const KM_FLOOR = Number(process.env.PRICE_KM_FLOOR ?? 8); // en dessous → prix plancher
const KM_CAP = Number(process.env.PRICE_KM_CAP ?? 50);    // au dessus → prix plafond

/** Grille de prix par type (€). */
const PRICE = {
  SIMPLE: { min: 8, max: 16 },
  EXPRESS: { min: 30, max: 35 },
} as const;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Calcule le prix pour une distance (km) et un type de livraison.
 * Retourne un montant en euros, arrondi à 2 décimales.
 */
export function priceForDistance(distanceKm: number, type: DeliveryType): number {
  const { min, max } = PRICE[type];
  // ratio 0 à KM_FLOOR, 1 à KM_CAP, linéaire entre les deux
  const ratio = clamp((distanceKm - KM_FLOOR) / (KM_CAP - KM_FLOOR), 0, 1);
  const price = min + ratio * (max - min);
  return Math.round(price * 100) / 100;
}

/** Détail de prix pour l'affichage (les 2 types d'un coup). */
export function priceBreakdown(distanceKm: number) {
  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    simple: priceForDistance(distanceKm, "SIMPLE"),
    express: priceForDistance(distanceKm, "EXPRESS"),
  };
}
