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
  { tracking: "TRK-9921", destinataire: "Ahmed Karoui", tel: "+49 152 2100200", ville: "Innenstadt-West", statut: "out_for_delivery", cod: "142,00 €", prix: "8,00 €", date: "09/06 08:12" },
  { tracking: "TRK-9920", destinataire: "Sarra Ben Ali", tel: "+49 159 8444121", ville: "Hörde", statut: "in_transit", cod: "89,00 €", prix: "8,00 €", date: "09/06 07:40" },
  { tracking: "TRK-9918", destinataire: "Youssef Gharbi", tel: "+49 155 0332880", ville: "Aplerbeck", statut: "pending", cod: "0,00 €", prix: "12,00 €", date: "09/06 07:05" },
  { tracking: "TRK-9915", destinataire: "Ines Trabelsi", tel: "+49 152 7901554", ville: "Brackel", statut: "delivered", cod: "210,00 €", prix: "10,00 €", date: "08/06 16:22" },
  { tracking: "TRK-9908", destinataire: "Mariem Saidi", tel: "+49 152 2555100", ville: "Innenstadt-West", statut: "failed", cod: "320,00 €", prix: "8,00 €", date: "08/06 14:10" },
  { tracking: "TRK-9901", destinataire: "Omar Belhaj", tel: "+49 155 0660880", ville: "Hombruch", statut: "delivered", cod: "98,00 €", prix: "12,00 €", date: "08/06 11:30" },
  { tracking: "TRK-9890", destinataire: "Selma Khelil", tel: "+49 152 2901333", ville: "Innenstadt-West", statut: "delivered", cod: "65,00 €", prix: "8,00 €", date: "07/06 16:00" },
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
  { numero: "FAC-2026-0142", periodeMonth: 5, periodeYear: 2026, montant: "1.480,00 €", date: "01/06/2026", statut: "paid" },
  { numero: "FAC-2026-0128", periodeMonth: 4, periodeYear: 2026, montant: "1.250,00 €", date: "01/05/2026", statut: "paid" },
  { numero: "FAC-2026-0115", periodeMonth: 3, periodeYear: 2026, montant: "980,00 €", date: "01/04/2026", statut: "paid" },
];

export type MyCodStatus = "collected" | "remitted";
export type MyCod = { tracking: string; destinataire: string; montant: string; statut: MyCodStatus; date: string; [key: string]: unknown };
export const myCodTone: Record<MyCodStatus, Tone> = { collected: "amber", remitted: "green" };
export const myCod: MyCod[] = [
  { tracking: "TRK-9915", destinataire: "Ines Trabelsi", montant: "210,00 €", statut: "collected", date: "08/06" },
  { tracking: "TRK-9901", destinataire: "Omar Belhaj", montant: "98,00 €", statut: "remitted", date: "08/06" },
  { tracking: "TRK-9890", destinataire: "Selma Khelil", montant: "65,00 €", statut: "remitted", date: "07/06" },
  { tracking: "TRK-9875", destinataire: "Khalil Mejri", montant: "55,00 €", statut: "remitted", date: "07/06" },
];

/** Activité de la semaine — `d` est une clé de jour traduite à l'affichage */
export const myActivity = [
  { d: "mon", v: 12 }, { d: "tue", v: 18 }, { d: "wed", v: 15 },
  { d: "thu", v: 22 }, { d: "fri", v: 28 }, { d: "sat", v: 19 }, { d: "sun", v: 8 },
];
