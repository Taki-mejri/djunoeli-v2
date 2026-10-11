import { isAxiosError } from "axios";

/**
 * Types et helper du feedback des stations de scan (espace dispatcher).
 *
 * Isolés de ScanStation.tsx : un fichier de composant ne doit exporter que des
 * composants pour que le Fast Refresh de Vite fonctionne
 * (règle eslint react-refresh/only-export-components).
 */

/**
 * Texte affiché : soit une CLÉ i18n (namespace "dispatch") + ses paramètres,
 * soit un message brut renvoyé par le backend. Jamais de texte figé : le
 * feedback vit dans le state, il doit donc se re-traduire si l'opérateur
 * change de langue en cours de session de scan.
 */
export type I18nText =
  | { key: string; params?: Record<string, string | number> }
  | { raw: string };

export type ScanFeedback = {
  kind: "success" | "warn" | "error";
  title: I18nText;
  detail?: I18nText;
  trackingNumber?: string;
};

/** Extrait le message d'erreur du backend, sinon null */
export function axiosMessage(err: unknown): string | null {
  return isAxiosError(err)
    ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message ?? null
    : null;
}
