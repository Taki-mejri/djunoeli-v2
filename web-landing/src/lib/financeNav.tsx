import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Wallet, Building2, FileText, TrendingUp,
} from "lucide-react";
import type { NavGroup } from "./adminNav";

/**
 * Navigation de l'espace finance.
 *
 * Hook (et non constante) : comme pour dispatch (étape 4), les libellés sont
 * traduits au rendu et doivent suivre immédiatement la bascule FR / DE. Les
 * intitulés de pages viennent du namespace `common` (nav.*), déjà partagé avec
 * l'admin ; seuls les titres de groupes sont propres à l'espace finance.
 *
 * Le type NavGroup vient d'adminNav (comme dispatchNav) : c'est celui qu'attend
 * DashboardLayout. Pas de champ `end` ici — Sidebar le déduit de homePath.
 */
export function useFinanceNav(): NavGroup[] {
  const { t } = useTranslation("finance");
  const { t: tc } = useTranslation("common");

  return useMemo(
    () => [
      {
        title: t("nav.groupMain"),
        items: [
          { path: "/finance", label: tc("nav.dashboard"), icon: <LayoutDashboard size={18} /> },
        ],
      },
      {
        title: t("nav.groupTreasury"),
        items: [
          { path: "/finance/livreurs", label: tc("nav.livreurBalances"), icon: <Wallet size={18} /> },
          { path: "/finance/expediteurs", label: tc("nav.expediteurCod"), icon: <Building2 size={18} /> },
        ],
      },
      {
        title: t("nav.groupBilling"),
        items: [
          { path: "/finance/factures", label: tc("nav.invoices"), icon: <FileText size={18} /> },
          { path: "/finance/rapports", label: tc("nav.reports"), icon: <TrendingUp size={18} /> },
        ],
      },
    ],
    // `t` / `tc` changent d'identité au changement de langue : les libellés se recalculent
    [t, tc]
  );
}
