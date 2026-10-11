import { Outlet, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, ClipboardList, Wallet, User } from "lucide-react";
import Logo from "../shared/Logo";
import LanguageSelector from "../shared/LanguageSelector";

const NAV = [
  { to: "/livreur", labelKey: "nav.home", icon: <Home size={22} />, end: true },
  { to: "/livreur/jobs", labelKey: "nav.jobs", icon: <ClipboardList size={22} /> },
  { to: "/livreur/cod", labelKey: "nav.cod", icon: <Wallet size={22} /> },
  { to: "/livreur/profile", labelKey: "nav.profile", icon: <User size={22} /> },
];

export default function LivreurLayout() {
  const { t } = useTranslation("livreur");

  return (
    <div className="liv-shell">
      {/* Barre du haut de la PWA : présente sur TOUS les écrans livreur, elle
          porte le sélecteur de langue (le livreur peut basculer FR/DE depuis
          n'importe quelle page, y compris la liste des courses et le détail). */}
      <header className="liv-topbar">
        <Logo variant="icon" height={26} className="liv-topbar-logo" />
        <span className="liv-topbar-name">Djunoeli</span>
        <LanguageSelector />
      </header>

      <div className="liv-content">
        <Outlet />
      </div>

      <nav className="liv-bottom">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `liv-tab ${isActive ? "active" : ""}`}
          >
            <span className="liv-tab-ic">{n.icon}</span>
            <span className="liv-tab-lbl">{t(n.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
