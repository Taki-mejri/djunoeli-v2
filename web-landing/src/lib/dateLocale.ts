/**
 * Petit helper i18n pour le formatage des dates.
 *
 * Les dates ne passent pas par i18next : on les formate avec Intl, mais il
 * faut une balise de langue cohérente avec la langue active de l'interface
 * (sinon on afficherait "9 June" dans un écran allemand).
 */
export function dateLocaleTag(lng: string | undefined): string {
  return lng?.toLowerCase().startsWith("en") ? "en-GB" : "de-DE";
}
