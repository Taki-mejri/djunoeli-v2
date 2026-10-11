import { Link } from "react-router-dom";
import Logo from "../shared/Logo";

export default function Footer({ onLogin }: { onLogin: () => void }) {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <a href="#top" className="logo" style={{ color: "#fff" }}>
              <Logo variant="icon" height={40} />
              Djunoeli
            </a>
            <p>La plateforme de livraison et de logistique pensée pour les entreprises tunisiennes.</p>
          </div>
          <div className="foot-col">
            <h4>Services</h4>
            <a href="#services">Livraison Express</a>
            <a href="#services">Paiement COD</a>
            <Link to="/track">Suivi en direct</Link>
            <a href="#services">Couverture nationale</a>
          </div>
          <div className="foot-col">
            <h4>Société</h4>
            <a href="#about">À propos</a>
            <a href="#contact">Contact</a>
            <a href="#how">Comment ça marche</a>
          </div>
          <div className="foot-col">
            <h4>Espaces</h4>
            <a onClick={onLogin}>Admin</a>
            <a onClick={onLogin}>Expéditeur</a>
            <a onClick={onLogin}>Livreur</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 Djunoeli. Tous droits réservés.</span>
          <span>Tunis, Tunisie · contact@djunoeli.tn</span>
        </div>
      </div>
    </footer>
  );
}
