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
 * - `showLanguageSelector` : sélecteur DE/EN (i18next), comme sur la landing
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
