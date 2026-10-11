import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import type { NavGroup } from "../../lib/adminNav";
import { useUser } from "../../lib/authStore";

type Props = {
  nav: NavGroup[];
  homePath: string;
  /** Étiquette de rôle affichée sous le nom (ex: "Super Admin", "Expéditeur"). */
  roleLabel: string;
  /** Fallback name si l'utilisateur n'est pas encore chargé (rare). */
  fallbackName?: string;
  footer?: { title: string; desc: string };
};

/**
 * Lit le user réel depuis le store Zustand (renseigné par /auth/me au bootstrap).
 * - name = companyName si dispo (expéditeur), sinon firstName + lastName, sinon email.
 * - initial = première lettre du name.
 */
export default function DashboardLayout({ nav, homePath, roleLabel, fallbackName, footer }: Props) {
  const [open, setOpen] = useState(true);
  const user = useUser();

  // On part du email comme dernier recours
  const baseName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email?.split("@")[0] ||
    fallbackName ||
    "Utilisateur";

  const displayName = baseName;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={`ds-shell ${open ? "" : "sidebar-collapsed"}`}>
      <Sidebar
        open={open}
        nav={nav}
        homePath={homePath}
        footerTitle={footer?.title}
        footerDesc={footer?.desc}
      />
      <div className="ds-main">
        <Topbar
          onToggle={() => setOpen((s) => !s)}
          userName={displayName}
          userRole={roleLabel}
          userInitial={initial}
        />
        <div className="ds-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
