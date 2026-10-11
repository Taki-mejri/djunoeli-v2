import { useReveal } from "../../lib/useReveal.tsx";

const Check = () => (
  <span className="ck">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" />
    </svg>
  </span>
);

export default function About() {
  const text = useReveal<HTMLDivElement>();
  const visual = useReveal<HTMLDivElement>(120);
  return (
    <section className="block" id="about">
      <div className="wrap about-grid">
        <div ref={text} className="about-text reveal">
          <div className="sec-kicker">À propos de Djunoeli</div>
          <h2>La livraison locale à Dortmund, enfin moderne</h2>
          <p>
            Djunoeli est née d'un constat simple : les commerces de Dortmund méritent
            un service de livraison fiable, transparent et entièrement numérique. Fini
            les appels pour savoir où est un colis.
          </p>
          <p>
            Nous connectons expéditeurs, livreurs et clients sur une seule plateforme,
            avec une livraison le jour même dans toute la ville.
          </p>
          <ul className="check-list">
            <li><Check /> Disponible en allemand et en anglais</li>
            <li><Check /> Facturation transparente et traçable en euros</li>
            <li><Check /> Données sécurisées et sauvegardées chaque jour</li>
          </ul>
        </div>
        <div ref={visual} className="about-visual reveal">
          <div className="a-card">
            <div className="a-stat-grid">
              <div className="a-stat accent"><div className="n">98.7%</div><div className="l">Taux de livraison réussie</div></div>
              <div className="a-stat"><div className="n">2.4h</div><div className="l">Délai moyen en ville</div></div>
              <div className="a-stat"><div className="n">24/24</div><div className="l">Suivi disponible</div></div>
              <div className="a-stat"><div className="n">+1.2k</div><div className="l">Entreprises clientes</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
