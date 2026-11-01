import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

/** Libellés : auth:roles.<key> (titre) + common:landing.loginModal.desc.<key> */
type Role = { key: "admin" | "expediteur" | "livreur"; cls: string; icon: React.ReactNode };

const roles: Role[] = [
  {
    key: "admin",
    cls: "rc-admin",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L3 7v6c0 5 3.8 8.5 9 11 5.2-2.5 9-6 9-11V7z" />
      </svg>
    ),
  },
  {
    key: "expediteur",
    cls: "rc-exp",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-6 9 6v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    key: "livreur",
    cls: "rc-liv",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
        <path d="M5 17H3V6h11v11M14 9h4l3 4v4h-2" />
      </svg>
    ),
  },
];

export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { t: ta } = useTranslation("auth");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const go = (role: string) => {
    onClose();
    navigate(`/${role}/login`);
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label={t("landing.loginModal.close")}>✕</button>
        <h3>{t("landing.loginModal.title")}</h3>
        <p className="m-sub">{t("landing.loginModal.sub")}</p>
        {roles.map((r) => (
          <div key={r.key} className="role-card" onClick={() => go(r.key)}>
            <span className={`rc-ic ${r.cls}`}>{r.icon}</span>
            <div>
              <div className="rc-t">{ta(`roles.${r.key}`)}</div>
              <div className="rc-d">{t(`landing.loginModal.desc.${r.key}`)}</div>
            </div>
            <span className="rc-arrow">→</span>
          </div>
        ))}
      </div>
    </div>
  );
}
