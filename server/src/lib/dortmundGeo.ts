/**
 * Données géographiques de Dortmund pour le pricing à la distance.
 *
 * - HUB : point d'origine fixe (dépôt). Lu depuis les variables d'env
 *   HUB_LAT / HUB_LNG pour pouvoir le changer sans toucher au code.
 *   Valeur par défaut = centre de Dortmund (à remplacer par les vraies coords).
 *
 * - QUARTIER_CENTERS : coordonnées approximatives du centre de chaque quartier,
 *   utilisées comme FALLBACK quand le géocodage de l'adresse précise échoue.
 *   Ces valeurs sont approximatives (±1-2 km) — la précision réelle vient du
 *   géocodage de l'adresse complète. À affiner si besoin.
 */

export type LatLng = { lat: number; lng: number };

/** Hub / dépôt — point de départ de la tournée. Override via env. */
export const HUB: LatLng = {
  lat: Number(process.env.HUB_LAT ?? 51.5136),
  lng: Number(process.env.HUB_LNG ?? 7.4653),
};

/**
 * Les 20 quartiers (Stadtteile) desservis — source unique côté serveur.
 * Doit rester synchronisé avec web-landing/src/lib/dortmund.ts.
 */
export const DORTMUND_DISTRICTS = [
  "Innenstadt-Nord", "Innenstadt-Ost", "Innenstadt-West", "Hörde", "Hombruch",
  "Aplerbeck", "Brackel", "Eving", "Huckarde", "Lütgendortmund",
  "Mengede", "Scharnhorst", "Nette", "Dorstfeld", "Kirchlinde",
  "Marten", "Wambel", "Körne", "Asseln", "Wickede",
] as const;

export type Quartier = (typeof DORTMUND_DISTRICTS)[number];

/**
 * Centres approximatifs des 20 quartiers de Dortmund (fallback géocodage).
 * Typé Record<Quartier, …> : un quartier manquant ou mal orthographié
 * est une erreur de compilation.
 */
export const QUARTIER_CENTERS: Record<Quartier, LatLng> = {
  "Innenstadt-Nord": { lat: 51.5200, lng: 7.4600 },
  "Innenstadt-Ost": { lat: 51.5130, lng: 7.4800 },
  "Innenstadt-West": { lat: 51.5100, lng: 7.4500 },
  "Hörde": { lat: 51.4890, lng: 7.5010 },
  "Hombruch": { lat: 51.4810, lng: 7.4440 },
  "Aplerbeck": { lat: 51.4950, lng: 7.5600 },
  "Brackel": { lat: 51.5230, lng: 7.5500 },
  "Eving": { lat: 51.5600, lng: 7.4700 },
  "Huckarde": { lat: 51.5430, lng: 7.4100 },
  "Lütgendortmund": { lat: 51.5050, lng: 7.3600 },
  "Mengede": { lat: 51.5820, lng: 7.3800 },
  "Scharnhorst": { lat: 51.5520, lng: 7.5400 },
  "Nette": { lat: 51.5700, lng: 7.4000 },
  "Dorstfeld": { lat: 51.5150, lng: 7.4200 },
  "Kirchlinde": { lat: 51.5250, lng: 7.3800 },
  "Marten": { lat: 51.5150, lng: 7.3700 },
  "Wambel": { lat: 51.5300, lng: 7.5100 },
  "Körne": { lat: 51.5180, lng: 7.5050 },
  "Asseln": { lat: 51.5350, lng: 7.5800 },
  "Wickede": { lat: 51.5400, lng: 7.6100 },
};

/** Distance haversine (vol d'oiseau) en km entre 2 points. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // rayon Terre en km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
