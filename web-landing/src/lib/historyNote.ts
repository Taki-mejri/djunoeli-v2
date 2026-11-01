/**
 * Rendu d'une note d'historique de colis.
 *
 * Les notes générées par le serveur sont stockées en base sous forme de clé
 * structurée JSON : {"k":"assigned","p":{"name":"Mohamed Ben Salah"}}.
 * On traduit la clé côté client (common:history.*) pour que l'affichage suive la
 * langue. Les anciennes lignes (prose française figée) ne commencent pas par "{"
 * et sont rendues telles quelles (fallback).
 *
 * Params spéciaux :
 *  - p.by    : "expediteur" | "admin"  → traduit via common:history.by.*
 *  - p.reason: texte libre (raison d'échec/annulation) → ajouté en suffixe, non traduit
 */

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

export function renderHistoryNote(note: string | null | undefined, t: TFunc): string {
  if (!note) return "";
  const trimmed = note.trim();

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { k?: string; p?: Record<string, unknown> };
      if (parsed && typeof parsed.k === "string") {
        const p: Record<string, unknown> = { ...(parsed.p ?? {}) };

        if (typeof p.by === "string") {
          p.by = t(`common:history.by.${p.by}`);
        }
        const reason = typeof p.reason === "string" ? p.reason : undefined;
        delete p.reason;

        let text = t(`common:history.${parsed.k}`, p);
        if (reason) text += ` · ${reason}`;
        return text;
      }
    } catch {
      /* note héritée (prose) → brut */
    }
  }

  return note;
}
