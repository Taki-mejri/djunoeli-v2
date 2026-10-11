import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Package, Truck, Users, Building2, ClipboardList,
  MapPin, Warehouse, Wallet, LifeBuoy, Settings, PhoneCall,
} from "lucide-react";
import type { ReactNode } from "react";

export type NavItem = { label: string; icon: ReactNode; path: string };
export type NavGroup = { title: string; items: NavItem[] };

/**
 * Navigation de l'espace administrateur.
 *
 * Hook (et non constante) comme dispatchNav/financeNav : les libellés sont
 * traduits au rendu, donc ils suivent la bascule DE / EN sans rechargement.
 * Les intitulés partagés viennent de `common` (nav.*), les autres d'`admin`.
 *
 * Le type NavGroup reste exporté ici : c'est celui qu'attendent Sidebar et
 * DashboardLayout, et les autres navs l'importent depuis ce fichier.
 */
export function useAdminNav(): NavGroup[] {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");

  return useMemo(
    () => [
      {
        title: t("nav.groupMain"),
        items: [
          { label: tc("nav.dashboard"), icon: <LayoutDashboard size={19} />, path: "/admin" },
          { label: t("nav.deliveries"), icon: <Package size={19} />, path: "/admin/shipments" },
          { label: t("nav.assignments"), icon: <ClipboardList size={19} />, path: "/admin/assignments" },
          { label: tc("nav.remoteAssign"), icon: <PhoneCall size={19} />, path: "/admin/remote-assign" },
          { label: t("nav.liveTracking"), icon: <MapPin size={19} />, path: "/admin/tracking" },
        ],
      },
      {
        title: t("nav.groupManage"),
        items: [
          { label: tc("nav.livreurs"), icon: <Truck size={19} />, path: "/admin/drivers" },
          { label: tc("nav.expediteurs"), icon: <Building2 size={19} />, path: "/admin/expediteurs" },
          { label: t("nav.customers"), icon: <Users size={19} />, path: "/admin/customers" },
          { label: t("nav.warehouses"), icon: <Warehouse size={19} />, path: "/admin/warehouses" },
        ],
      },
      {
        title: t("nav.groupFinance"),
        items: [
          { label: tc("nav.finance"), icon: <Wallet size={19} />, path: "/admin/finance" },
          { label: t("wallet:nav.wallets"), icon: <Wallet size={19} />, path: "/admin/wallets" },
        ],
      },
      {
        title: t("nav.groupSystem"),
        items: [
          { label: t("nav.support"), icon: <LifeBuoy size={19} />, path: "/admin/support" },
          { label: t("nav.settings"), icon: <Settings size={19} />, path: "/admin/settings" },
        ],
      },
    ],
    // `t` / `tc` changent d'identité au changement de langue : les libellés se recalculent
    [t, tc]
  );
}
