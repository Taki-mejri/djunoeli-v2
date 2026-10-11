import { useTranslation } from "react-i18next";
import { Wallet, ArrowDownToLine } from "lucide-react";
import LivHeader from "../../components/livreur/LivHeader";
import { livJobs } from "../../lib/livreurData";
import { formatEUR } from "../../lib/money";

export default function LivCodPage() {
  const { t } = useTranslation("livreur");

  // NB : `statut` est une valeur interne de la donnée mock (jamais affichée),
  // elle sert uniquement de filtre — rien à traduire ici.
  const collected = livJobs.filter((j) => j.statut === "Livré" && j.cod > 0);
  const pending = livJobs.filter((j) => j.statut === "À livrer" && j.cod > 0);
  const totalHeld = collected.reduce((s, j) => s + j.cod, 0);
  const totalPending = pending.reduce((s, j) => s + j.cod, 0);

  return (
    <>
      <LivHeader title={t("cod.title")} subtitle={t("cod.subtitle")} />

      <div className="liv-cod-big">
        <span className="lcb-lbl">{t("cod.cashToRemit")}</span>
        <span className="lcb-val">{formatEUR(totalHeld)}</span>
        <button className="liv-deliver-btn" style={{ marginTop: 16 }}>
          <ArrowDownToLine size={17} /> {t("cod.remitToOffice")}
        </button>
      </div>

      <div className="liv-section-title">{t("cod.toCollect", { amount: formatEUR(totalPending) })}</div>
      {pending.map((j) => (
        <div className="liv-cod-row" key={j.id}>
          <span className="lcr-ic pending"><Wallet size={18} /></span>
          <div className="lcr-info">
            <b>{j.id}</b>
            {/* Quartiers de Dortmund : non traduits */}
            <span>{j.client} · {j.ville}</span>
          </div>
          <span className="lcr-amt">{formatEUR(j.cod)}</span>
        </div>
      ))}

      <div className="liv-section-title" style={{ marginTop: 20 }}>{t("cod.collectedToday")}</div>
      {collected.map((j) => (
        <div className="liv-cod-row" key={j.id}>
          <span className="lcr-ic done"><Wallet size={18} /></span>
          <div className="lcr-info">
            <b>{j.id}</b>
            <span>{j.client} · {j.heure}</span>
          </div>
          <span className="lcr-amt ok">+{formatEUR(j.cod)}</span>
        </div>
      ))}
    </>
  );
}
