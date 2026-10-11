import type { Tone } from "../components/dashboard/StatusBadge";

export type LivStatus = "À ramasser" | "À livrer" | "Livré" | "Échoué";
export const livTone: Record<LivStatus, Tone> = {
  "À ramasser": "blue",
  "À livrer": "amber",
  "Livré": "green",
  "Échoué": "red",
};

export type LivJob = {
  id: string;
  client: string;
  tel: string;
  adresse: string;
  ville: string;
  statut: LivStatus;
  cod: number;
  fragile: boolean;
  description: string;
  expediteur: string;
  heure: string;
};

export const livJobs: LivJob[] = [
  { id: "TRK-9921", client: "Ahmed Karoui", tel: "+49 152 2100200", adresse: "Kampstraße 12", ville: "Innenstadt-Nord", statut: "À ramasser", cod: 0, fragile: false, description: "Vêtements", expediteur: "Medina Store", heure: "09:30" },
  { id: "TRK-9918", client: "Sarra Ben Ali", tel: "+49 159 8444121", adresse: "Hörder Bahnhofstraße 8", ville: "Hörde", statut: "À livrer", cod: 142, fragile: false, description: "Cosmétiques", expediteur: "Boutique El Manar", heure: "10:15" },
  { id: "TRK-9915", client: "Youssef Gharbi", tel: "+49 155 0332880", adresse: "Kaiserstraße 5, Whg. 4B", ville: "Innenstadt-Ost", statut: "À livrer", cod: 89, fragile: true, description: "Verrerie (fragile)", expediteur: "Medina Store", heure: "11:00" },
  { id: "TRK-9908", client: "Mariem Saidi", tel: "+49 152 2555100", adresse: "Gleiwitzstraße 3", ville: "Scharnhorst", statut: "À livrer", cod: 320, fragile: false, description: "Électronique", expediteur: "TechZone", heure: "11:45" },
  { id: "TRK-9901", client: "Omar Belhaj", tel: "+49 155 0660880", adresse: "Münsterstraße 40", ville: "Innenstadt-Nord", statut: "Livré", cod: 98, fragile: false, description: "Livres", expediteur: "Boutique El Manar", heure: "08:45" },
  { id: "TRK-9890", client: "Selma Khelil", tel: "+49 152 2901333", adresse: "Wittener Straße 22", ville: "Dorstfeld", statut: "Livré", cod: 65, fragile: false, description: "Vêtements enfant", expediteur: "Medina Store", heure: "08:10" },
];
