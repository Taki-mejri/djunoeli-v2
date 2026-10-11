import { HUB, QUARTIER_CENTERS, type LatLng, type Quartier } from "../lib/dortmundGeo.js";

/**
 * Géocodage d'une adresse de livraison → coordonnées.
 *
 * Stratégie (décidée avec Taki) :
 *  1. On tente de géocoder l'adresse précise via Nominatim (OpenStreetMap, gratuit),
 *     en limitant à Dortmund pour la pertinence.
 *  2. Si ça échoue (adresse introuvable, réseau, timeout) → FALLBACK sur le
 *     centre du quartier choisi (jamais de blocage).
 *
 * Résultat : { coords, source } où source = "geocoded" | "quartier_fallback".
 */

type GeocodeResult = {
  coords: LatLng;
  source: "geocoded" | "quartier_fallback";
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 4000;

/**
 * Géocode une adresse dans un quartier de Dortmund.
 * @param address  adresse libre saisie (rue + numéro). Peut être vide.
 * @param quartier nom exact du quartier (clé de QUARTIER_CENTERS) — obligatoire,
 *                 sert de fallback et affine la requête.
 */
export async function geocodeDelivery(address: string, quartier: Quartier): Promise<GeocodeResult> {
  const fallback = QUARTIER_CENTERS[quartier];

  // Garde-fou : le quartier est validé par le schéma (enum), mais si jamais
  // il manquait on retombe sur le hub plutôt que de planter.
  const safeFallback: LatLng = fallback ?? HUB;

  // Pas d'adresse précise → direct le centre du quartier.
  if (!address || address.trim().length < 3) {
    return { coords: safeFallback, source: "quartier_fallback" };
  }

  try {
    const q = `${address.trim()}, ${quartier}, Dortmund, Germany`;
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=de`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Nominatim exige un User-Agent identifiant l'app
        "User-Agent": "Djunoeli-Delivery/1.0 (contact@djunoeli.de)",
        "Accept-Language": "de",
      },
    });
    clearTimeout(timer);

    if (!res.ok) return { coords: safeFallback, source: "quartier_fallback" };

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data || data.length === 0) {
      return { coords: safeFallback, source: "quartier_fallback" };
    }

    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { coords: safeFallback, source: "quartier_fallback" };
    }

    return { coords: { lat, lng }, source: "geocoded" };
  } catch {
    // Timeout, réseau coupé, réponse invalide → fallback
    return { coords: safeFallback, source: "quartier_fallback" };
  }
}
