import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Package, Truck, CheckCircle2, Wallet, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { myShipments, myShipmentTone, myActivity } from "../../lib/expediteurData";
import { useUser } from "../../lib/authStore";
import { useMyExpediteurProfile } from "../../lib/expediteurQueries";

const kpis = [
  { key: "monthly", value: "184", icon: <Package size={20} />, tone: "t-navy" },
  { key: "inProgress", value: "12", icon: <Truck size={20} />, tone: "t-amber" },
  { key: "delivered", value: "158", icon: <CheckCircle2 size={20} />, tone: "t-green" },
  { key: "codPending", value: "440 DT", icon: <Wallet size={20} />, tone: "t-teal" },
];

export default function ExpediteurDashboard() {
  const user = useUser();
  const { t } = useTranslation("expediteur");
  // Récupère le profil expéditeur depuis /expediteur/me (companyName officiel)
  const { data: profile } = useMyExpediteurProfile();

  // Priorité : companyName du profil > prénom/nom du user > préfixe email > libellé de rôle
  const displayName =
    profile?.companyName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email?.split("@")[0] ||
    t("layout.fallbackName");

  const recent = myShipments.slice(0, 5);

  // Les jours du graphe sont stockés en clés ("mon", "tue"...) et traduits ici
  const activity = myActivity.map((a) => ({ ...a, d: t(`dashboard.days.${a.d}`) }));

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("dashboard.greeting", { name: displayName })}</h1>
          <p>{t("dashboard.subtitle")}</p>
        </div>
        <Link to="/expediteur/new" className="ds-btn-primary">{t("dashboard.createCta")}</Link>
      </div>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.key}>
            <div className={`kpi-ic ${k.tone}`}>{k.icon}</div>
            <div className="kpi-body">
              <span className="kpi-label">{t(`dashboard.kpi.${k.key}`)}</span>
              <span className="kpi-value">{k.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="chart-row">
        <div className="panel">
          <div className="panel-head">
            <h3>{t("dashboard.chart.title")}</h3>
            <span className="panel-tag">{t("dashboard.chart.tag")}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={activity} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1fc4a0" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1fc4a0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8a99a8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8a99a8" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e3eaf0", fontSize: 13 }} />
              <Area type="monotone" dataKey="v" name={t("dashboard.chart.series")} stroke="#0e9c7d" strokeWidth={2.5} fill="url(#gExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>{t("dashboard.codPanel.title")}</h3></div>
          <div className="cod-summary">
            <div className="cs-main">
              <span className="cs-label">{t("dashboard.codPanel.toRemit")}</span>
              <span className="cs-value">440 DT</span>
            </div>
            <div className="cs-split">
              <div><span className="cs-lbl">{t("dashboard.codPanel.collected")}</span><span className="cs-v">231 DT</span></div>
              <div><span className="cs-lbl">{t("dashboard.codPanel.remittedMonth")}</span><span className="cs-v">218 DT</span></div>
            </div>
            <Link to="/expediteur/cod" className="cs-link">{t("dashboard.codPanel.detail")} <ArrowRight size={14} /></Link>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>{t("dashboard.recent.title")}</h3>
          <Link to="/expediteur/shipments" className="panel-link">{t("dashboard.recent.seeAll")}</Link>
        </div>
        <div className="dtable-scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>{t("table.tracking")}</th>
                <th>{t("table.receiver")}</th>
                <th>{t("table.city")}</th>
                <th>{t("table.status")}</th>
                <th style={{ textAlign: "right" }}>{t("table.cod")}</th>
                <th>{t("table.date")}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => (
                <tr key={s.tracking}>
                  <td><b className="mono-cell">{s.tracking}</b></td>
                  <td>{s.destinataire}</td>
                  {/* Les gouvernorats ne se traduisent pas */}
                  <td>{s.ville}</td>
                  <td><StatusBadge label={t(`mock.shipmentStatus.${s.statut}`)} tone={myShipmentTone[s.statut]} /></td>
                  <td style={{ textAlign: "right" }}><span className="num-cell">{s.cod}</span></td>
                  <td>{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
