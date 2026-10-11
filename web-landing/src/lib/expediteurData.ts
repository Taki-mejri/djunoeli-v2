import type { Tone } from "../components/dashboard/StatusBadge";

/**
 * Données de démonstration de l'espace expéditeur.
 *
 * Les statuts / périodes sont stockés sous forme de CLÉS (et non de libellés
 * français) : l'affichage passe par i18next (namespace "expediteur", section
 * "mock"), pour que ces écrans se traduisent comme le reste de l'espace.
 * Les villes (gouvernorats tunisiens) et les noms propres ne se traduisent pas.
 */

export type MyShipmentStatus =
  | "pending" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "failed";

export const myShipmentTone: Record<MyShipmentStatus, Tone> = {
  pending: "gray",
  picked_up: "blue",
  in_transit: "violet",
  out_for_delivery: "amber",
  delivered: "green",
  failed: "red",
};

export type MyShipment = {
  tracking: string;
  destinataire: string;
  tel: string;
  ville: string;
  statut: MyShipmentStatus;
  cod: string;
  prix: string;
  date: string;
  [key: string]: unknown;
};

export const myShipments: MyShipment[] = [
  { tracking: "TRK-9921", destinataire: "Ahmed Karoui", tel: "+216 22 100 200", ville: "Tunis", statut: "out_for_delivery", cod: "142 DT", prix: "8 DT", date: "09/06 08:12" },
  { tracking: "TRK-9920", destinataire: "Sarra Ben Ali", tel: "+216 98 444 121", ville: "Ariana", statut: "in_transit", cod: "89 DT", prix: "8 DT", date: "09/06 07:40" },
  { tracking: "TRK-9918", destinataire: "Youssef Gharbi", tel: "+216 50 332 880", ville: "Sfax", statut: "pending", cod: "0 DT", prix: "12 DT", date: "09/06 07:05" },
  { tracking: "TRK-9915", destinataire: "Ines Trabelsi", tel: "+216 27 901 554", ville: "Sousse", statut: "delivered", cod: "210 DT", prix: "10 DT", date: "08/06 16:22" },
  { tracking: "TRK-9908", destinataire: "Mariem Saidi", tel: "+216 22 555 100", ville: "Tunis", statut: "failed", cod: "320 DT", prix: "8 DT", date: "08/06 14:10" },
  { tracking: "TRK-9901", destinataire: "Omar Belhaj", tel: "+216 50 660 880", ville: "Bizerte", statut: "delivered", cod: "98 DT", prix: "12 DT", date: "08/06 11:30" },
  { tracking: "TRK-9890", destinataire: "Selma Khelil", tel: "+216 22 901 333", ville: "Tunis", statut: "delivered", cod: "65 DT", prix: "8 DT", date: "07/06 16:00" },
];

export type MyInvoiceStatus = "paid" | "pending" | "late";
export const myInvoiceTone: Record<MyInvoiceStatus, Tone> = { paid: "green", pending: "amber", late: "red" };
export type MyInvoice = {
  numero: string;
  /** Mois de la période facturée (1-12), traduit à l'affichage */
  periodeMonth: number;
  periodeYear: number;
  montant: string;
  date: string;
  statut: MyInvoiceStatus;
  [key: string]: unknown;
};
export const myInvoices: MyInvoice[] = [
  { numero: "FAC-2026-0142", periodeMonth: 5, periodeYear: 2026, montant: "1 480 DT", date: "01/06/2026", statut: "paid" },
  { numero: "FAC-2026-0128", periodeMonth: 4, periodeYear: 2026, montant: "1 250 DT", date: "01/05/2026", statut: "paid" },
  { numero: "FAC-2026-0115", periodeMonth: 3, periodeYear: 2026, montant: "980 DT", date: "01/04/2026", statut: "paid" },
];

export type MyCodStatus = "collected" | "remitted";
export type MyCod = { tracking: string; destinataire: string; montant: string; statut: MyCodStatus; date: string; [key: string]: unknown };
export const myCodTone: Record<MyCodStatus, Tone> = { collected: "amber", remitted: "green" };
export const myCod: MyCod[] = [
  { tracking: "TRK-9915", destinataire: "Ines Trabelsi", montant: "210 DT", statut: "collected", date: "08/06" },
  { tracking: "TRK-9901", destinataire: "Omar Belhaj", montant: "98 DT", statut: "remitted", date: "08/06" },
  { tracking: "TRK-9890", destinataire: "Selma Khelil", montant: "65 DT", statut: "remitted", date: "07/06" },
  { tracking: "TRK-9875", destinataire: "Khalil Mejri", montant: "55 DT", statut: "remitted", date: "07/06" },
];

/** Activité de la semaine — `d` est une clé de jour traduite à l'affichage */
export const myActivity = [
  { d: "mon", v: 12 }, { d: "tue", v: 18 }, { d: "wed", v: 15 },
  { d: "thu", v: 22 }, { d: "fri", v: 28 }, { d: "sat", v: 19 }, { d: "sun", v: 8 },
];
