import { useTranslation } from "react-i18next";
import DashboardLayout from "../dashboard/DashboardLayout";
import { useFinanceNav } from "../../lib/financeNav";

/**
 * Coquille de l'espace finance.
 *
 * DashboardLayout reçoit sa nav en prop : on passe par ce petit composant pour
 * pouvoir appeler useFinanceNav() et traduire aussi le rôle affiché dans la
 * topbar et le pied de sidebar (auparavant figés en français dans App.tsx).
 */
export default function FinanceLayout() {
  const { t } = useTranslation("finance");
  const nav = useFinanceNav();

  return (
    <DashboardLayout
      nav={nav}
      homePath="/finance"
      roleLabel={t("layout.roleLabel")}
      fallbackName={t("layout.footerTitle")}
      footer={{ title: t("layout.footerTitle"), desc: t("layout.footerDesc") }}
    />
  );
}
