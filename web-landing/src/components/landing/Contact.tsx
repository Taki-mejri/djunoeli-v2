import { useReveal } from "../../lib/useReveal.tsx";

const Phone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);
const Mail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 6l-10 7L2 6" />
  </svg>
);
const Pin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default function Contact() {
  const info = useReveal<HTMLDivElement>();
  const form = useReveal<HTMLDivElement>(100);

  const submit = () => alert("Démo — le formulaire sera connecté au backend.");

  return (
    <section className="block" id="contact" style={{ paddingBottom: 60 }}>
      <div className="contact">
        <div className="contact-inner">
          <div ref={info} className="reveal">
            <div className="sec-kicker" style={{ color: "var(--teal)" }}>Contactez-nous</div>
            <h2>Parlons de votre logistique</h2>
            <p className="lead">Une question, un devis, un partenariat ? Notre équipe vous répond rapidement.</p>
            <ul className="contact-info">
              <li><span className="ci-ic"><Phone /></span><div><div className="ci-l">Téléphone</div><div className="ci-v">+216 71 000 000</div></div></li>
              <li><span className="ci-ic"><Mail /></span><div><div className="ci-l">E-mail</div><div className="ci-v">contact@djunoeli.tn</div></div></li>
              <li><span className="ci-ic"><Pin /></span><div><div className="ci-l">Adresse</div><div className="ci-v">Tunis, Tunisie</div></div></li>
            </ul>
          </div>
          <div ref={form} className="form reveal">
            <div className="row2">
              <div className="field"><label>Nom</label><input placeholder="Votre nom" /></div>
              <div className="field"><label>Téléphone</label><input placeholder="+216 ..." /></div>
            </div>
            <div className="field"><label>E-mail</label><input placeholder="vous@entreprise.tn" /></div>
            <div className="field"><label>Message</label><textarea rows={4} placeholder="Comment pouvons-nous vous aider ?" /></div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={submit}>
              Envoyer le message
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
