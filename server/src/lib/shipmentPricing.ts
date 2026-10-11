import { HUB, haversineKm, type Quartier } from "./dortmundGeo.js";
import { priceForDistance, type DeliveryType } from "./pricing.js";
import { geocodeDelivery } from "../services/geocode.service.js";

/**
 * Helpers pour la création de colis v2 :
 *  - calcul du prix côté serveur (jamais confiance au client)
 *  - date de tournée selon la règle des 11h (fuseau Europe/Berlin)
 */

export type ComputedShipment = {
  distanceKm: number;
  lat: number;
  lng: number;
  geocodeSource: "geocoded" | "quartier_fallback";
  price: number;
};

/**
 * Calcule prix + coords + distance pour un colis.
 * Le prix dépend du type (SIMPLE | EXPRESS) et de la distance au hub.
 */
export async function computeShipmentPricing(input: {
  quartier: Quartier;
  address?: string;
  type: DeliveryType;
}): Promise<ComputedShipment> {
  const { coords, source } = await geocodeDelivery(input.address ?? "", input.quartier);
  const distanceKm = haversineKm(HUB, coords);
  const price = priceForDistance(distanceKm, input.type);
  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    lat: coords.lat,
    lng: coords.lng,
    geocodeSource: source,
    price,
  };
}

/* =====================================================
   Règle des 11h (fuseau Europe/Berlin)
   ===================================================== */

const CUTOFF_HOUR = Number(process.env.PICKUP_CUTOFF_HOUR ?? 11); // 11h par défaut
const TZ = "Europe/Berlin";

type BerlinParts = { year: number; month: number; day: number; hour: number };

/** Date/heure murale à Berlin pour un instant donné. */
function berlinParts(at: Date): BerlinParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

/**
 * Instant UTC correspondant à « jour J, HH:00 heure de Berlin ».
 * On calcule le décalage Berlin↔UTC à cet instant (gère heure d'été/hiver),
 * sans dépendre du fuseau du serveur.
 */
function berlinWallClockToDate(year: number, month: number, day: number, hour: number): Date {
  const guess = Date.UTC(year, month - 1, day, hour);
  const p = berlinParts(new Date(guess));
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour);
  return new Date(guess - (asIfUtc - guess));
}

/**
 * Détermine la date de tournée (pickup) d'un colis.
 * - EXPRESS : immédiat → maintenant (le flux express part tout de suite, étape 4).
 * - SIMPLE  : si l'heure courante < 11h (Berlin) → tournée du jour ; sinon demain.
 * Retourne l'instant de la tournée (11h heure de Berlin) + today/tomorrow.
 */
export function computePlannedPickup(type: DeliveryType, now: Date = new Date()): {
  plannedPickupDate: Date;
  round: "today" | "tomorrow" | "express";
} {
  if (type === "EXPRESS") {
    return { plannedPickupDate: now, round: "express" };
  }

  const today = berlinParts(now);
  const beforeCutoff = today.hour < CUTOFF_HOUR;
  // Jour de tournée : aujourd'hui ou demain (Date.UTC gère fin de mois/année)
  const target = new Date(Date.UTC(today.year, today.month - 1, today.day + (beforeCutoff ? 0 : 1)));
  const plannedPickupDate = berlinWallClockToDate(
    target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), CUTOFF_HOUR
  );

  return { plannedPickupDate, round: beforeCutoff ? "today" : "tomorrow" };
}
