import { axiosMessage } from "./scanFeedback";

/**
 * Bandeau de l'espace finance : soit une CLÉ i18n (namespace "finance") + ses
 * paramètres, soit un message brut renvoyé par le backend.
 *
 * Même principe que le feedback des stations de scan (étape 4) : le bandeau
 * vit dans le state, on n'y stocke donc jamais de texte figé — sinon il
 * resterait en français après une bascule de langue.
 */
export type BannerText =
  | { key: string; params?: Record<string, string | number> }
  | { raw: string };

/** Erreur serveur : message brut du backend, sinon la clé de repli fournie. */
export function bannerFromError(err: unknown, fallbackKey: string): BannerText {
  const msg = axiosMessage(err);
  return msg ? { raw: msg } : { key: fallbackKey };
}
