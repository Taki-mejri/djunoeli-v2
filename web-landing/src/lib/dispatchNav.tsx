import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  PackagePlus,
  ArrowDownWideNarrow,
  TruckElectric,
  ClipboardCheck,
  PhoneCall,
  History,
} from "lucide-react";
import type { NavGroup } from "./adminNav";

/**
 * Navigation de l'espace dispatcher.
 *
 * Hook (et non constante) : comme pour l'espace livreur (étape 3), les libellés
 * sont traduits et doivent changer immédiatement quand l'opérateur bascule
 * FR / DE. Une constante hors composant ne peut pas appeler useTranslation().
 */
export function useDispatchNav(): NavGroup[] {
  const { t } = useTranslation("dispatch");

  return useMemo(
    () => [
      {
        title: t("nav.groupMain"),
        items: [
          { label: t("nav.dashboard"), icon: <LayoutDashboard size={19} />, path: "/dispatch" },
        ],
      },
      {
        title: t("nav.groupStations"),
        items: [
          { label: t("nav.reception"), icon: <PackagePlus size={19} />, path: "/dispatch/reception" },
          { label: t("nav.sorting"), icon: <ArrowDownWideNarrow size={19} />, path: "/dispatch/tri" },
          { label: t("nav.assignment"), icon: <TruckElectric size={19} />, path: "/dispatch/assignation" },
          { label: t("nav.verification"), icon: <ClipboardCheck size={19} />, path: "/dispatch/verification" },
          { label: t("nav.remoteAssign"), icon: <PhoneCall size={19} />, path: "/dispatch/remote-assign" },
        ],
      },
      {
        title: t("nav.groupTracking"),
        items: [
          { label: t("nav.scanHistory"), icon: <History size={19} />, path: "/dispatch/historique" },
        ],
      },
    ],
    // `t` change d'identité au changement de langue : les libellés se recalculent
    [t]
  );
}
