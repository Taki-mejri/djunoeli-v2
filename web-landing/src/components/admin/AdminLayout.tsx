import { useTranslation } from "react-i18next";
import DashboardLayout from "../dashboard/DashboardLayout";
import { useAdminNav } from "../../lib/adminNav";

/**
 * Coquille de l'espace administrateur.
 *
 * Même rôle que FinanceLayout (étape 5) : DashboardLayout reçoit sa nav en
 * prop, on passe donc par ce composant pour appeler useAdminNav() et traduire
 * aussi le rôle de la topbar et le pied de sidebar, jusque-là figés dans App.tsx.
 */
export default function AdminLayout() {
  const { t } = useTranslation("admin");
  const nav = useAdminNav();

  return (
    <DashboardLayout
      nav={nav}
      homePath="/admin"
      roleLabel={t("layout.roleLabel")}
      fallbackName="Admin"
      footer={{ title: t("layout.footerTitle"), desc: t("layout.footerDesc") }}
    />
  );
}
