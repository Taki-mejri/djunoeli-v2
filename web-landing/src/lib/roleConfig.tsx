import type { ReactNode } from "react";
import { ShieldCheck, Package, Truck, Warehouse, Wallet } from "lucide-react";

export type RoleKey = "admin" | "expediteur" | "livreur" | "dispatch" | "finance";

/**
 * Config visuelle d'un rôle sur les pages de connexion.
 *
 * Aucun texte affiché ici : la tagline et les puces vivent dans le namespace
 * `auth` (taglines.* / taglineBullets.*), et le nom du rôle dans auth.roles.*.
 * `label` ne sert plus qu'au code interne (jamais rendu tel quel).
 */
export type RoleConfig = {
  key: RoleKey;
  label: string;
  panelClass: string; // classe CSS du panneau de gauche (couleur)
  icon: ReactNode;
  dashboardPath: string; // où rediriger après connexion (placeholder pour l'instant)
};

export const roleConfig: Record<RoleKey, RoleConfig> = {
  admin: {
    key: "admin",
    label: "Administrateur",
    panelClass: "auth-admin",
    icon: <ShieldCheck size={26} />,
    dashboardPath: "/admin",
  },
  expediteur: {
    key: "expediteur",
    label: "Expéditeur",
    panelClass: "auth-exp",
    icon: <Package size={26} />,
    dashboardPath: "/expediteur",
  },
  livreur: {
    key: "livreur",
    label: "Livreur",
    panelClass: "auth-liv",
    icon: <Truck size={26} />,
    dashboardPath: "/livreur",
  },
  dispatch: {
    key: "dispatch",
    label: "Dispatcher",
    panelClass: "auth-dispatch",
    icon: <Warehouse size={26} />,
    dashboardPath: "/dispatch",
  },
  finance: {
    key: "finance",
    label: "Finance",
    panelClass: "auth-finance",
    icon: <Wallet size={26} />,
    dashboardPath: "/finance",
  },
};
