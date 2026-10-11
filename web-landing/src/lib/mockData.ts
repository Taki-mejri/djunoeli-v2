import type { Tone } from "../components/dashboard/StatusBadge";

/* ---------- LIVRAISONS ---------- */
export type ShipmentStatus =
  | "En attente" | "Pris en charge" | "En transit" | "En livraison"
  | "Livré" | "Échoué" | "Retourné";

export const shipmentTone: Record<ShipmentStatus, Tone> = {
  "En attente": "gray",
  "Pris en charge": "blue",
  "En transit": "violet",
  "En livraison": "amber",
  "Livré": "green",
  "Échoué": "red",
  "Retourné": "navy",
};

export type Shipment = {
  tracking: string; expediteur: string; destinataire: string; ville: string;
  livreur: string; statut: ShipmentStatus; cod: string; date: string;
  [key: string]: unknown;
};

export const shipments: Shipment[] = [
  { tracking: "TRK-9921", expediteur: "Medina Store", destinataire: "Ahmed Karoui", ville: "Tunis", livreur: "Skander T.", statut: "En livraison", cod: "142 DT", date: "09/06 08:12" },
  { tracking: "TRK-9920", expediteur: "Boutique El Manar", destinataire: "Sarra Ben Ali", ville: "Ariana", livreur: "Mohamed B.", statut: "En transit", cod: "89 DT", date: "09/06 07:40" },
  { tracking: "TRK-9918", expediteur: "TechZone", destinataire: "Youssef Gharbi", ville: "Sfax", livreur: "—", statut: "En attente", cod: "0 DT", date: "09/06 07:05" },
  { tracking: "TRK-9915", expediteur: "Medina Store", destinataire: "Ines Trabelsi", ville: "Sousse", livreur: "Ali R.", statut: "Livré", cod: "210 DT", date: "08/06 16:22" },
  { tracking: "TRK-9912", expediteur: "Parfum Plus", destinataire: "Khalil Mejri", ville: "Nabeul", livreur: "Skander T.", statut: "Pris en charge", cod: "55 DT", date: "08/06 15:48" },
  { tracking: "TRK-9908", expediteur: "TechZone", destinataire: "Mariem Saidi", ville: "Tunis", livreur: "Hatem K.", statut: "Échoué", cod: "320 DT", date: "08/06 14:10" },
  { tracking: "TRK-9901", expediteur: "Boutique El Manar", destinataire: "Omar Belhaj", ville: "Bizerte", livreur: "Mohamed B.", statut: "Livré", cod: "98 DT", date: "08/06 11:30" },
];

/* ---------- LIVREURS ---------- */
export type DriverStatus = "Disponible" | "Occupé" | "Hors ligne";
export const driverTone: Record<DriverStatus, Tone> = { "Disponible": "green", "Occupé": "amber", "Hors ligne": "gray" };

export type Driver = {
  nom: string; tel: string; vehicule: string; zone: string;
  statut: DriverStatus; courses: number; note: string; [key: string]: unknown;
};
export const drivers: Driver[] = [
  { nom: "Skander Trabelsi", tel: "+216 22 145 887", vehicule: "Moto", zone: "Tunis", statut: "Occupé", courses: 8, note: "4.9" },
  { nom: "Mohamed Ben Salah", tel: "+216 98 332 014", vehicule: "Camionnette", zone: "Ariana", statut: "Disponible", courses: 5, note: "4.7" },
  { nom: "Ali Rebai", tel: "+216 50 778 220", vehicule: "Moto", zone: "Sousse", statut: "Disponible", courses: 6, note: "4.8" },
  { nom: "Hatem Khelifi", tel: "+216 24 909 551", vehicule: "Voiture", zone: "Tunis", statut: "Hors ligne", courses: 0, note: "4.5" },
  { nom: "Nizar Aouni", tel: "+216 27 661 309", vehicule: "Camionnette", zone: "Sfax", statut: "Occupé", courses: 4, note: "4.6" },
];

/* ---------- EXPÉDITEURS ---------- */
export type Expediteur = {
  societe: string; contact: string; tel: string; colis: number;
  ca: string; impaye: string; [key: string]: unknown;
};
export const expediteurs: Expediteur[] = [
  { societe: "Medina Store", contact: "Ahmed Karoui", tel: "+216 71 220 110", colis: 482, ca: "12 400 DT", impaye: "320 DT" },
  { societe: "Boutique El Manar", contact: "Leila Mansour", tel: "+216 71 884 200", colis: 311, ca: "8 950 DT", impaye: "0 DT" },
  { societe: "TechZone", contact: "Wassim Daoud", tel: "+216 71 552 901", colis: 268, ca: "15 200 DT", impaye: "1 100 DT" },
  { societe: "Parfum Plus", contact: "Rania Sassi", tel: "+216 71 330 778", colis: 154, ca: "4 600 DT", impaye: "0 DT" },
];

/* ---------- CLIENTS ---------- */
export type Customer = {
  nom: string; tel: string; ville: string; commandes: number; total: string; [key: string]: unknown;
};
export const customers: Customer[] = [
  { nom: "Ahmed Karoui", tel: "+216 22 100 200", ville: "Tunis", commandes: 14, total: "1 980 DT" },
  { nom: "Sarra Ben Ali", tel: "+216 98 444 121", ville: "Ariana", commandes: 9, total: "1 120 DT" },
  { nom: "Youssef Gharbi", tel: "+216 50 332 880", ville: "Sfax", commandes: 22, total: "3 410 DT" },
  { nom: "Ines Trabelsi", tel: "+216 27 901 554", ville: "Sousse", commandes: 6, total: "640 DT" },
];

/* ---------- FACTURES ---------- */
export type InvoiceStatus = "Payée" | "En attente" | "En retard";
export const invoiceTone: Record<InvoiceStatus, Tone> = { "Payée": "green", "En attente": "amber", "En retard": "red" };
export type Invoice = {
  numero: string; expediteur: string; montant: string; date: string; statut: InvoiceStatus; [key: string]: unknown;
};
export const invoices: Invoice[] = [
  { numero: "FAC-2026-0142", expediteur: "Medina Store", montant: "1 480 DT", date: "01/06/2026", statut: "Payée" },
  { numero: "FAC-2026-0141", expediteur: "TechZone", montant: "2 210 DT", date: "01/06/2026", statut: "En attente" },
  { numero: "FAC-2026-0138", expediteur: "Boutique El Manar", montant: "950 DT", date: "28/05/2026", statut: "En retard" },
  { numero: "FAC-2026-0135", expediteur: "Parfum Plus", montant: "620 DT", date: "25/05/2026", statut: "Payée" },
];

/* ---------- COD ---------- */
export type Cod = {
  tracking: string; livreur: string; expediteur: string; montant: string;
  statut: "Collecté" | "Reversé"; date: string; [key: string]: unknown;
};
export const codTone: Record<Cod["statut"], Tone> = { "Collecté": "amber", "Reversé": "green" };
export const codCollections: Cod[] = [
  { tracking: "TRK-9915", livreur: "Ali R.", expediteur: "Medina Store", montant: "210 DT", statut: "Collecté", date: "08/06" },
  { tracking: "TRK-9901", livreur: "Mohamed B.", expediteur: "Boutique El Manar", montant: "98 DT", statut: "Reversé", date: "08/06" },
  { tracking: "TRK-9888", livreur: "Skander T.", expediteur: "TechZone", montant: "340 DT", statut: "Collecté", date: "07/06" },
  { tracking: "TRK-9875", livreur: "Nizar A.", expediteur: "Parfum Plus", montant: "75 DT", statut: "Reversé", date: "07/06" },
];

/* ---------- SUPPORT ---------- */
export type TicketStatus = "Ouvert" | "En cours" | "Résolu";
export const ticketTone: Record<TicketStatus, Tone> = { "Ouvert": "red", "En cours": "amber", "Résolu": "green" };
export type Ticket = {
  id: string; sujet: string; auteur: string; priorite: "Haute" | "Moyenne" | "Basse"; statut: TicketStatus; date: string; [key: string]: unknown;
};
export const tickets: Ticket[] = [
  { id: "#T-204", sujet: "Colis non reçu TRK-9908", auteur: "Mariem Saidi", priorite: "Haute", statut: "Ouvert", date: "09/06" },
  { id: "#T-203", sujet: "Erreur montant COD", auteur: "Medina Store", priorite: "Moyenne", statut: "En cours", date: "08/06" },
  { id: "#T-201", sujet: "Modifier adresse livraison", auteur: "Omar Belhaj", priorite: "Basse", statut: "Résolu", date: "07/06" },
];

/* ---------- ASSIGNATION (file d'attente) ---------- */
export const unassigned = shipments.filter((s) => s.livreur === "—" || s.statut === "En attente");

/* ---------- ENTREPÔTS ---------- */
export type Warehouse = { nom: string; ville: string; capacite: string; colis: number; [key: string]: unknown };
export const warehouses: Warehouse[] = [
  { nom: "Hub Tunis Centre", ville: "Tunis", capacite: "2 000", colis: 1240 },
  { nom: "Hub Sfax", ville: "Sfax", capacite: "1 200", colis: 560 },
  { nom: "Hub Sousse", ville: "Sousse", capacite: "900", colis: 480 },
];
