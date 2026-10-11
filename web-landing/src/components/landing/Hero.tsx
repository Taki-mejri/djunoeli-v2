import { useReveal, CountUp } from "../../lib/useReveal.tsx";

export default function Hero({ onLogin }: { onLogin: () => void }) {
  const left = useReveal<HTMLDivElement>();
  const right = useReveal<HTMLDivElement>(150);

  return (
    <section className="hero" id="top">
      <div className="hero-grid" />
      <div className="wrap hero-inner">
        <div ref={left} className="reveal">
          <span className="pill-tag">
            <span className="dot" /> Livraison same-day à Dortmund
          </span>
          <h1>
            Vos colis livrés,
            <br />
            <span className="accent">partout, à temps.</span>
          </h1>
          <p className="sub">
            Djunoeli livre vos colis le jour même dans tout Dortmund — de la prise en
            charge à la remise, avec un suivi en temps réel du premier au dernier
            kilomètre.
          </p>
          <div className="hero-cta">
            <button className="btn btn-primary" onClick={onLogin}>
              Accéder à mon espace →
            </button>
            <a href="#services" className="btn btn-ghost">
              Découvrir nos services
            </a>
          </div>
          <div className="hero-trust">
            <div>
              <CountUp target={50000} className="t-num" />
              <div className="t-lbl">Colis livrés</div>
            </div>
            <div>
              <CountUp target={120} className="t-num" />
              <div className="t-lbl">Livreurs actifs</div>
            </div>
            <div>
              <CountUp target={20} suffix="" className="t-num" />
              <div className="t-lbl">Quartiers desservis</div>
            </div>
          </div>
        </div>

        <div ref={right} className="reveal">
          <div className="hero-card">
            <div className="track-head">
              <span className="track-id">#TRK-5487-DJ</span>
              <span className="track-badge">En route</span>
            </div>
            <div className="timeline">
              <div className="tl-step done">
                <span className="node" />
                <div className="s-title">Colis créé</div>
                <div className="s-time">08:12 · Innenstadt-West</div>
              </div>
              <div className="tl-step done">
                <span className="node" />
                <div className="s-title">Pris en charge</div>
                <div className="s-time">09:40 · Depot Dortmund</div>
              </div>
              <div className="tl-step active">
                <span className="node" />
                <div className="s-title">En cours de livraison</div>
                <div className="s-time">11:05 · Hörde</div>
              </div>
              <div className="tl-step pending">
                <span className="node" />
                <div className="s-title">Livré</div>
                <div className="s-time">Estimé 12:30</div>
              </div>
            </div>
            <div className="float-badge">
              <span className="float-ic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#04241c" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <div className="fb-num">98.7%</div>
                <div className="fb-lbl">Taux de réussite</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
