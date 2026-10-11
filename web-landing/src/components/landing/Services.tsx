import type { ReactNode } from "react";
import { useReveal } from "../../lib/useReveal.tsx";

type Service = {
  title: string;
  desc: string;
  icon: ReactNode;
  tag?: string;
};

const services: Service[] = [
  {
    title: "Livraison Express",
    desc: "Prise en charge le jour même et livraison rapide partout en Tunisie, du centre-ville aux zones rurales.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-6 9 6v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    title: "Paiement à la livraison (COD)",
    desc: "Encaissez le montant à la livraison. Suivi de chaque dinar, du livreur jusqu'au règlement de l'expéditeur.",
    tag: "POPULAIRE",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
  },
  {
    title: "Suivi en Temps Réel",
    desc: "Vos clients suivent leur colis en direct, étape par étape, avec une position GPS du livreur sur la carte.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    title: "Couverture Nationale",
    desc: "Un réseau de livreurs présent dans les 24 gouvernorats, avec des hubs régionaux pour réduire les délais.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    title: "Tableau de Bord & Rapports",
    desc: "Statistiques en direct, performance des livreurs, revenus et rapports exportables en un clic.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    title: "Notifications Automatiques",
    desc: "SMS, WhatsApp et e-mail à chaque étape : colis pris en charge, en route, et livré.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
];

function Card({ s, delay }: { s: Service; delay: number }) {
  const ref = useReveal<HTMLDivElement>(delay);
  return (
    <div ref={ref} className="svc reveal">
      {s.tag && <span className="tag-mini">{s.tag}</span>}
      <div className="svc-ic">{s.icon}</div>
      <h3>{s.title}</h3>
      <p>{s.desc}</p>
    </div>
  );
}

export default function Services() {
  const head = useReveal<HTMLDivElement>();
  return (
    <section className="block" id="services">
      <div className="wrap">
        <div ref={head} className="sec-head reveal">
          <div className="sec-kicker">Nos Services</div>
          <h2>Tout ce qu'il faut pour livrer</h2>
          <p>
            Une plateforme complète pensée pour les entreprises tunisiennes qui veulent
            expédier vite, suivre en direct et encaisser sans souci.
          </p>
        </div>
        <div className="svc-grid">
          {services.map((s, i) => (
            <Card key={s.title} s={s} delay={(i % 3) * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}
