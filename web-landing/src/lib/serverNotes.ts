/**
 * Notes système du journal de suivi.
 *
 * Le backend écrit ces notes en français directement en base — et le dispatch
 * les interroge par leur contenu (`note: { contains: "Reçu" }`), donc on ne
 * peut pas les changer côté serveur. On les remappe ici vers des clés i18n
 * (namespace "common") pour qu'elles suivent la langue active de l'interface.
 *
 * Introduit à l'étape 2 (ShipmentTimeline, espace expéditeur) et partagé
 * depuis l'étape 3 avec la mini-timeline de l'espace livreur.
 *
 * Toute note non listée — raison saisie par un humain, note contenant des
 * données dynamiques (nom de dépôt, de livreur, montant COD) — reste affichée
 * telle quelle : on ne traduit jamais du texte libre.
 */
const SERVER_NOTE_KEYS: Record<string, string> = {
  "Colis créé": "serverNotes.created",
  "Ramassé": "serverNotes.pickedUp",
  "En route": "serverNotes.inTransit",
  "En livraison": "serverNotes.outForDelivery",
  "Livré": "serverNotes.delivered",
  "Échec de livraison": "serverNotes.failed",
  "Désassigné du livreur": "serverNotes.unassigned",
};

/**
 * Renvoie la clé i18n d'une note système connue, ou null si la note est du
 * texte libre (à afficher brut).
 */
export function serverNoteKey(note: string): string | null {
  return SERVER_NOTE_KEYS[note.trim()] ?? null;
}
