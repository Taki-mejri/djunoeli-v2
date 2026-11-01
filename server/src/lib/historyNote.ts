/**
 * Note d'historique structurée, traduite côté client (common:history.*).
 *
 * Stockée en base sous forme JSON : {"k":"assigned","p":{"name":"Mohamed Ben Salah"}}.
 * Le front (web-landing/src/lib/historyNote.ts) traduit `k`, traduit `p.by`, et
 * ajoute `p.reason` (texte libre, jamais traduit) en suffixe.
 * Les paramètres vides (undefined / null / "") sont omis.
 */
export type HistoryNoteKey =
  | "created"
  | "assigned"
  | "reassigned"
  | "unassigned"
  | "pickedUp"
  | "pickedUpExpress"
  | "outForDelivery"
  | "delivered"
  | "deliveredExpressOnTime"
  | "deliveredExpressLate"
  | "failed"
  | "cancelled"
  | "callAnswered"
  | "callNoAnswer"
  | "callWrongNumber"
  | "callRescheduled";

export function historyNote(
  k: HistoryNoteKey,
  p?: Record<string, string | number | null | undefined>
): string {
  const params = Object.fromEntries(
    Object.entries(p ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  return JSON.stringify(Object.keys(params).length > 0 ? { k, p: params } : { k });
}
