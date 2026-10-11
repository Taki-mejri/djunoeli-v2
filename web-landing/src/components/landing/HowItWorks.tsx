import { useReveal } from "../../lib/useReveal.tsx";

const steps = [
  { n: 1, title: "Créez l'envoi", desc: "L'expéditeur saisit les détails du colis et l'adresse depuis son espace." },
  { n: 2, title: "On assigne", desc: "Le colis est attribué au livreur le plus proche et disponible." },
  { n: 3, title: "Suivi en direct", desc: "Tout le monde suit le colis en temps réel jusqu'à destination." },
  { n: 4, title: "Livré & encaissé", desc: "Preuve de livraison, encaissement COD et règlement automatique." },
];

function Step({ s, delay }: { s: (typeof steps)[number]; delay: number }) {
  const ref = useReveal<HTMLDivElement>(delay);
  return (
    <div ref={ref} className="step reveal">
      <div className="step-n">{s.n}</div>
      <h3>{s.title}</h3>
      <p>{s.desc}</p>
    </div>
  );
}

export default function HowItWorks() {
  const head = useReveal<HTMLDivElement>();
  return (
    <section className="block how" id="how">
      <div className="wrap">
        <div ref={head} className="sec-head reveal">
          <div className="sec-kicker" style={{ color: "var(--teal)" }}>Simple & Rapide</div>
          <h2>Comment ça marche</h2>
          <p>Quatre étapes, de la commande à la livraison réussie.</p>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <Step key={s.n} s={s} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
