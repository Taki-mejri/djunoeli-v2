import { useState } from "react";

const tabs = ["Société", "Sécurité", "Intégrations"];

export default function SettingsPage() {
  const [tab, setTab] = useState("Société");

  return (
    <>
      <div className="ds-page-head">
        <div><h1>Paramètres</h1><p>Configuration de la plateforme Djunoeli.</p></div>
      </div>

      <div className="settings-tabs">
        {tabs.map((t) => (
          <button key={t} className={`st-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="panel settings-panel">
        {tab === "Société" && (
          <>
            <div className="set-field"><label>Nom de la société</label><input defaultValue="Djunoeli" /></div>
            <div className="set-row">
              <div className="set-field"><label>Téléphone</label><input defaultValue="+216 71 000 000" /></div>
              <div className="set-field"><label>N° TVA</label><input defaultValue="1234567/A/M/000" /></div>
            </div>
            <div className="set-field"><label>Adresse</label><input defaultValue="Tunis, Tunisie" /></div>
            <button className="ds-btn-primary">Enregistrer</button>
          </>
        )}
        {tab === "Sécurité" && (
          <>
            <div className="set-toggle"><div><b>Authentification à deux facteurs (2FA)</b><p>Sécurise les comptes admin avec un code.</p></div><label className="switch"><input type="checkbox" defaultChecked /><span /></label></div>
            <div className="set-toggle"><div><b>Expiration de session</b><p>Déconnexion automatique après 30 min d'inactivité.</p></div><label className="switch"><input type="checkbox" defaultChecked /><span /></label></div>
            <div className="set-field"><label>Politique de mot de passe</label><select className="tbl-select"><option>Forte (8+ caractères, chiffres, symboles)</option><option>Moyenne</option></select></div>
            <button className="ds-btn-primary">Enregistrer</button>
          </>
        )}
        {tab === "Intégrations" && (
          <div className="integ-list">
            {[
              { n: "Passerelle SMS", d: "Notifications par SMS", on: true },
              { n: "WhatsApp Business API", d: "Mises à jour WhatsApp", on: false },
              { n: "SMTP E-mail", d: "Envoi des factures par e-mail", on: true },
              { n: "Passerelle de paiement", d: "Paiements en ligne", on: false },
            ].map((i) => (
              <div className="integ-item" key={i.n}>
                <div><b>{i.n}</b><p>{i.d}</p></div>
                <span className={`sbadge ${i.on ? "sb-green" : "sb-gray"}`}>{i.on ? "Connecté" : "Inactif"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
