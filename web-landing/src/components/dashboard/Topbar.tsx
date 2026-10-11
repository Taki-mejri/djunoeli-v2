import { useEffect, useRef, useState } from "react";
import { Menu, Search, Bell, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLogout } from "../../lib/authQueries";
import LanguageSelector from "../shared/LanguageSelector";

type Props = {
  onToggle: () => void;
  userName: string;
  userRole: string;
  userInitial: string;
};

export default function Topbar({ onToggle, userName, userRole, userInitial }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const logout = useLogout();
  const { t } = useTranslation("common");

  // Ferme le menu si on clique en dehors
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const doLogout = async () => {
    setOpen(false);
    await logout.mutateAsync();
    navigate("/", { replace: true });
  };

  return (
    <header className="ds-topbar">
      <div className="ds-top-left">
        <button className="ds-icon-btn" onClick={onToggle} aria-label={t("topbar.menu")}>
          <Menu size={20} />
        </button>
        <div className="ds-search">
          <Search size={18} />
          <input placeholder={t("topbar.search")} />
        </div>
      </div>

      <div className="ds-top-right">
        <LanguageSelector />
        <button className="ds-icon-btn ds-bell" aria-label={t("topbar.notifications")}>
          <Bell size={19} />
          <span className="ds-badge-dot" />
        </button>
        <div className="ds-divider" />

        <div className="ds-user-wrap" ref={ref}>
          <button className="ds-user" onClick={() => setOpen((s) => !s)}>
            <span className="ds-avatar">{userInitial}</span>
            <span className="ds-user-info">
              <span className="ds-user-name">{userName}</span>
              <span className="ds-user-role">{userRole}</span>
            </span>
            <ChevronDown size={16} />
          </button>

          {open && (
            <div className="ds-user-menu">
              <button className="ds-menu-item" onClick={() => setOpen(false)}>
                <UserIcon size={16} /> {t("topbar.myProfile")}
              </button>
              <div className="ds-menu-sep" />
              <button className="ds-menu-item danger" onClick={doLogout} disabled={logout.isPending}>
                <LogOut size={16} /> {logout.isPending ? t("topbar.loggingOut") : t("topbar.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
