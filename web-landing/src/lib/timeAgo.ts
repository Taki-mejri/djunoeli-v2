/**
 * « Il y a X » relatif, en CLÉ i18n plutôt qu'en phrase.
 *
 * La fonction ne renvoie pas de texte : elle renvoie la clé du namespace
 * "finance" et ses paramètres, et le composant traduit au rendu. Une fonction
 * hors composant ne peut pas appeler useTranslation(), et un texte figé ne
 * suivrait pas la bascule FR / DE.
 *
 * Fichier séparé (et non exporté depuis la page) pour la règle eslint
 * react-refresh/only-export-components, comme scanFeedback.ts à l'étape 4.
 */
export type TimeAgo = { key: string; params?: { count: number } };

export function timeAgoKey(iso: string | null): TimeAgo {
  if (!iso) return { key: "livreurBalances.timeAgo.never" };
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return { key: "livreurBalances.timeAgo.today" };
  if (days === 1) return { key: "livreurBalances.timeAgo.yesterday" };
  return { key: "livreurBalances.timeAgo.daysAgo", params: { count: days } };
}
