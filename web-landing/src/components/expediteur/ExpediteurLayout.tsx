import { useTranslation } from "react-i18next";
import DashboardLayout from "../dashboard/DashboardLayout";
import { useExpediteurNav } from "../../lib/expediteurNav";

/**
 * Shell de l'espace expéditeur : le layout générique + la navigation et les
 * libellés traduits (namespace "expediteur"). Isolé dans un composant pour
 * pouvoir utiliser les hooks i18n (App.tsx n'est qu'une table de routes).
 */
export default function ExpediteurLayout() {
  const { t } = useTranslation("expediteur");
  const nav = useExpediteurNav();

  return (
    <DashboardLayout
      nav={nav}
      homePath="/expediteur"
      roleLabel={t("layout.roleLabel")}
      fallbackName={t("layout.fallbackName")}
      footer={{ title: t("layout.helpTitle"), desc: t("layout.helpDesc") }}
    />
  );
}
