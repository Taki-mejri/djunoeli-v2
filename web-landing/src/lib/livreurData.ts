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
  { id: "TRK-9921", client: "Ahmed Karoui", tel: "+216 22 100 200", adresse: "12 Rue de Carthage, Imm. Salem", ville: "Tunis Centre", statut: "À ramasser", cod: 0, fragile: false, description: "Vêtements", expediteur: "Medina Store", heure: "09:30" },
  { id: "TRK-9918", client: "Sarra Ben Ali", tel: "+216 98 444 121", adresse: "Av. Habib Bourguiba, Imm. Le Palmarium", ville: "Ariana", statut: "À livrer", cod: 142, fragile: false, description: "Cosmétiques", expediteur: "Boutique El Manar", heure: "10:15" },
  { id: "TRK-9915", client: "Youssef Gharbi", tel: "+216 50 332 880", adresse: "5 Rue du Lac, Apt. 4B", ville: "Les Berges du Lac", statut: "À livrer", cod: 89, fragile: true, description: "Verrerie (fragile)", expediteur: "Medina Store", heure: "11:00" },
  { id: "TRK-9908", client: "Mariem Saidi", tel: "+216 22 555 100", adresse: "Cité El Khadra, Bloc 3", ville: "El Khadra", statut: "À livrer", cod: 320, fragile: false, description: "Électronique", expediteur: "TechZone", heure: "11:45" },
  { id: "TRK-9901", client: "Omar Belhaj", tel: "+216 50 660 880", adresse: "Av. de Madrid, Imm. Nour", ville: "Tunis Centre", statut: "Livré", cod: 98, fragile: false, description: "Livres", expediteur: "Boutique El Manar", heure: "08:45" },
  { id: "TRK-9890", client: "Selma Khelil", tel: "+216 22 901 333", adresse: "Rue Ibn Khaldoun", ville: "Le Bardo", statut: "Livré", cod: 65, fragile: false, description: "Vêtements enfant", expediteur: "Medina Store", heure: "08:10" },
];
