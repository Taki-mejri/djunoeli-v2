/**
 * Zone de service v2 : les quartiers (Stadtteile) de Dortmund.
 * Noms propres, JAMAIS traduits. Doit rester synchronisé avec
 * server/src/schemas/dispatcherScan.schema.ts (DORTMUND_DISTRICTS).
 */
export const DORTMUND_DISTRICTS = [
  "Innenstadt-Nord", "Innenstadt-Ost", "Innenstadt-West", "Hörde", "Hombruch",
  "Aplerbeck", "Brackel", "Eving", "Huckarde", "Lütgendortmund",
  "Mengede", "Scharnhorst", "Nette", "Dorstfeld", "Kirchlinde",
  "Marten", "Wambel", "Körne", "Asseln", "Wickede",
] as const;
