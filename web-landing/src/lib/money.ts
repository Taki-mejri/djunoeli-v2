/**
 * Formatage monétaire unique de l'application (v2 Dortmund) : euros, locale de-DE.
 * Ex. formatEUR(1480) → "1.480,00 €".
 */
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatEUR(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return eur.format(Number.isFinite(n) ? n : 0);
}
