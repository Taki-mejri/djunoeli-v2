import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, PackagePlus, Package, Receipt, User } from "lucide-react";

export type NavItem = { label: string; icon: ReactNode; path: string };
export type NavGroup = { title: string; items: NavItem[] };

/**
 * Navigation de l'espace expéditeur.
 * Hook (et non constante) : les libellés sont traduits et doivent changer
 * immédiatement quand l'utilisateur bascule DE / EN.
 */
export function useExpediteurNav(): NavGroup[] {
  const { t } = useTranslation("expediteur");

  return useMemo(
    () => [
      {
        title: t("nav.groupSpace"),
        items: [
          { label: t("nav.dashboard"), icon: <LayoutDashboard size={19} />, path: "/expediteur" },
          { label: t("nav.create"), icon: <PackagePlus size={19} />, path: "/expediteur/new" },
          { label: t("nav.shipments"), icon: <Package size={19} />, path: "/expediteur/shipments" },
        ],
      },
      {
        title: t("nav.groupFinance"),
        items: [
          { label: t("nav.invoices"), icon: <Receipt size={19} />, path: "/expediteur/invoices" },
          // v2 : entrée COD masquée (paiement à la livraison supprimé, wallet à venir)
        ],
      },
      {
        title: t("nav.groupAccount"),
        items: [
          { label: t("nav.profile"), icon: <User size={19} />, path: "/expediteur/profile" },
        ],
      },
    ],
    // `t` change d'identité au changement de langue : les libellés se recalculent
    [t]
  );
}
