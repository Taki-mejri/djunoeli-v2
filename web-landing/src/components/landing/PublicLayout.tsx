import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import LoginModal from "./LoginModal";

/**
 * Coquille publique (hors landing) : garde le menu et le pied de page de la
 * landing autour d'une page publique — aujourd'hui /track.
 *
 * - `solid` : pas de hero marine derrière la barre, elle est donc blanche d'emblée
 * - `showLanguageSelector` : sélecteur FR/DE (i18next) pour que le suivi public
 *   soit consultable dans les deux langues. Le toggle FR/ع de la landing n'est
 *   volontairement pas rendu ici (il pilote seulement la direction RTL locale
 *   de la landing, pas i18next).
 */
export default function PublicLayout() {
  const [loginOpen, setLoginOpen] = useState(false);
  const openLogin = () => setLoginOpen(true);

  return (
    <>
      <Navbar onLogin={openLogin} solid showLanguageSelector />
      <main className="trk-shell">
        <Outlet />
      </main>
      <Footer onLogin={openLogin} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
