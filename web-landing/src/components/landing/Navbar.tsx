import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "../shared/Logo";
import LanguageSelector from "../shared/LanguageSelector";

type Props = {
  onLogin: () => void;
  /** Force le style "barre blanche" (pages sans hero marine derrière, ex. /track). */
  solid?: boolean;
  /** Affiche le sélecteur de langue DE/EN (i18next) à côté du bouton de connexion. */
  showLanguageSelector?: boolean;
};

export default function Navbar({
  onLogin,
  solid = false,
  showLanguageSelector = false,
}: Props) {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslation("track");
  const { pathname } = useLocation();

  // Hors de la landing, les ancres doivent repartir vers "/" (ex. /#services)
  const onLanding = pathname === "/";
  const anchor = (hash: string) => (onLanding ? hash : `/${hash}`);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${scrolled ? "scrolled" : ""} ${solid ? "solid" : ""}`.trim()}>
      <div className="wrap">
        <nav>
          <a href={anchor("#top")} className="logo">
            {/* PNG transparent : rend aussi bien sur le hero marine qu'une fois
                la barre passée en blanc au scroll. */}
            <Logo variant="icon" height={40} />
            Djunoeli
          </a>
          <ul className="nav-links">
            <li><a href={anchor("#services")}>Services</a></li>
            <li><a href={anchor("#how")}>Comment ça marche</a></li>
            <li><a href={anchor("#about")}>À propos</a></li>
            <li>
              <Link to="/track" className={pathname.startsWith("/track") ? "nav-active" : ""}>
                {t("menuLink")}
              </Link>
            </li>
            <li><a href={anchor("#contact")}>Contact</a></li>
          </ul>
          <div className="nav-right">
            {showLanguageSelector && <LanguageSelector />}
            <button className="btn btn-primary" onClick={onLogin}>
              Se connecter
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
