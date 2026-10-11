/** Formatage monétaire des messages serveur (v2 Dortmund) : euros, locale de-DE. */
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatEUR(value: number): string {
  return eur.format(Number.isFinite(value) ? value : 0);
}
