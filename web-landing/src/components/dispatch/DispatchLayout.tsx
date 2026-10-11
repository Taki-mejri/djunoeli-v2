import { useTranslation } from "react-i18next";
import DashboardLayout from "../dashboard/DashboardLayout";
import { useDispatchNav } from "../../lib/dispatchNav";

/**
 * Shell de l'espace dispatcher : le layout générique + la navigation et les
 * libellés traduits (namespace "dispatch"). Isolé dans un composant pour
 * pouvoir utiliser les hooks i18n (App.tsx n'est qu'une table de routes),
 * comme ExpediteurLayout à l'étape 2.
 */
export default function DispatchLayout() {
  const { t } = useTranslation("dispatch");
  const nav = useDispatchNav();

  return (
    <DashboardLayout
      nav={nav}
      homePath="/dispatch"
      roleLabel={t("layout.roleLabel")}
      fallbackName={t("layout.fallbackName")}
      footer={{ title: t("layout.footerTitle"), desc: t("layout.footerDesc") }}
    />
  );
}
