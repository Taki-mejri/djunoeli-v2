import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "../shared/Logo";

export default function Footer({ onLogin }: { onLogin: () => void }) {
  const { t } = useTranslation("common");

  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <a href="#top" className="logo" style={{ color: "#fff" }}>
              <Logo variant="icon" height={40} />
              Djunoeli
            </a>
            <p>{t("landing.footer.tagline")}</p>
          </div>
          <div className="foot-col">
            <h4>{t("landing.footer.services")}</h4>
            <a href="#services">{t("landing.footer.sameDay")}</a>
            <a href="#services">{t("landing.footer.billing")}</a>
            <Link to="/track">{t("landing.footer.liveTracking")}</Link>
            <a href="#services">{t("landing.footer.allDortmund")}</a>
          </div>
          <div className="foot-col">
            <h4>{t("landing.footer.company")}</h4>
            <a href="#about">{t("landing.nav.about")}</a>
            <a href="#contact">{t("landing.nav.contact")}</a>
            <a href="#how">{t("landing.nav.how")}</a>
          </div>
          <div className="foot-col">
            <h4>{t("landing.footer.spaces")}</h4>
            <a onClick={onLogin}>{t("landing.footer.admin")}</a>
            <a onClick={onLogin}>{t("landing.footer.expediteur")}</a>
            <a onClick={onLogin}>{t("landing.footer.livreur")}</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>{t("landing.footer.rights", { year: new Date().getFullYear() })}</span>
          <span>{t("landing.footer.location")} · contact@djunoeli.de</span>
        </div>
      </div>
    </footer>
  );
}
