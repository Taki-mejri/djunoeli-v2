import { useTranslation } from "react-i18next";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Package, CheckCircle2, Truck, Wallet, TrendingUp, TrendingDown,
} from "lucide-react";
import type { ReactNode } from "react";
import { dateLocaleTag } from "../../lib/dateLocale";

/* ---- Données démo (seront remplacées par l'API) ----
 *
 * Les VALEURS restent des données fictives, mais aucun LIBELLÉ n'est figé :
 * chaque entrée porte une clé i18n, traduite au rendu dans le composant.
 * Une constante hors composant ne peut pas appeler useTranslation().
 */
const kpis: {
  labelKey: string; value: string; delta: string; up: boolean; icon: ReactNode; tone: string;
}[] = [
  { labelKey: "dashboard.stats.totalShipments", value: "3 482", delta: "+12,5%", up: true, icon: <Package size={20} />, tone: "t-navy" },
  { labelKey: "dashboard.stats.deliveredToday", value: "287", delta: "+8,2%", up: true, icon: <CheckCircle2 size={20} />, tone: "t-teal" },
  { labelKey: "dashboard.stats.inTransit", value: "94", delta: "-3,1%", up: false, icon: <Truck size={20} />, tone: "t-amber" },
  { labelKey: "dashboard.stats.revenueMonth", value: "48.250,00 €", delta: "+18,4%", up: true, icon: <Wallet size={20} />, tone: "t-green" },
];

const dailyKeys = [
  { k: "mon", v: 210 }, { k: "tue", v: 280 }, { k: "wed", v: 250 },
  { k: "thu", v: 310 }, { k: "fri", v: 340 }, { k: "sat", v: 290 }, { k: "sun", v: 180 },
];

/* Les quartiers ne se traduisent pas ; seul « Autres » porte une clé. */
const regions: { name?: string; labelKey?: string; v: number }[] = [
  { name: "Innenstadt-Nord", v: 1240 }, { name: "Hörde", v: 720 }, { name: "Aplerbeck", v: 560 },
  { name: "Brackel", v: 480 }, { name: "Eving", v: 320 },
  { labelKey: "dashboard.charts.otherRegions", v: 162 },
];
const regionColors = ["#0d2a47", "#15507e", "#1fc4a0", "#0e9c7d", "#7cc6b3", "#b9d9d0"];

const activity = [
  { tKey: "dashboard.activity.created", sKey: "dashboard.activity.createdSub", timeKey: "dashboard.activity.minutesAgo", count: 2, c: "a-blue" },
  { tKey: "dashboard.activity.deliveredTitle", sKey: "dashboard.activity.deliveredSub", timeKey: "dashboard.activity.minutesAgo", count: 11, c: "a-green" },
  { tKey: "dashboard.activity.assigned", sKey: "dashboard.activity.assignedSub", timeKey: "dashboard.activity.minutesAgo", count: 24, c: "a-teal" },
  { tKey: "dashboard.activity.codReceived", sKey: "dashboard.activity.codReceivedSub", timeKey: "dashboard.activity.minutesAgo", count: 38, c: "a-amber" },
  { tKey: "dashboard.activity.newExpediteur", sKey: "dashboard.activity.newExpediteurSub", timeKey: "dashboard.activity.hoursAgo", count: 1, c: "a-violet" },
];

export default function AdminDashboard() {
  const { t, i18n } = useTranslation("admin");
  const locale = dateLocaleTag(i18n.language);

  // La date du jour suit la langue de l'interface (mardi 9 juin / Dienstag, 9. Juni)
  const today = new Date().toLocaleDateString(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const daily = dailyKeys.map((d) => ({ d: t(`dashboard.days.${d.k}`), v: d.v }));
  const regionData = regions.map((r) => ({
    name: r.labelKey ? t(r.labelKey) : r.name,
    v: r.v,
  }));

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("dashboard.title")}</h1>
          <p>{t("dashboard.subtitle")} — {today}.</p>
        </div>
        <button className="ds-btn-primary">{t("dashboard.newShipment")}</button>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.labelKey}>
            <div className={`kpi-ic ${k.tone}`}>{k.icon}</div>
            <div className="kpi-body">
              <span className="kpi-label">{t(k.labelKey)}</span>
              <span className="kpi-value">{k.value}</span>
            </div>
            <span className={`kpi-delta ${k.up ? "up" : "down"}`}>
              {k.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {k.delta}
            </span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="chart-row">
        <div className="panel">
          <div className="panel-head">
            <h3>{t("dashboard.charts.perDay")}</h3>
            <span className="panel-tag">{t("dashboard.charts.last7Days")}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={daily} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gTeal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1fc4a0" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1fc4a0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8a99a8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8a99a8" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e3eaf0", fontSize: 13 }} />
              <Area type="monotone" dataKey="v" name={t("dashboard.charts.seriesDeliveries")} stroke="#0e9c7d" strokeWidth={2.5} fill="url(#gTeal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>{t("dashboard.charts.perRegion")}</h3>
            <span className="panel-tag">{t("dashboard.charts.thisMonth")}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={regionData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8a99a8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8a99a8" }} />
              <Tooltip cursor={{ fill: "#f5f8fb" }} contentStyle={{ borderRadius: 12, border: "1px solid #e3eaf0", fontSize: 13 }} />
              <Bar dataKey="v" name={t("dashboard.charts.seriesShipments")} radius={[6, 6, 0, 0]}>
                {regionData.map((_, i) => (
                  <Cell key={i} fill={regionColors[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity + success */}
      <div className="bottom-row">
        <div className="panel">
          <div className="panel-head">
            <h3>{t("dashboard.recentActivity")}</h3>
            <a className="panel-link">{t("dashboard.seeAll")}</a>
          </div>
          <ul className="activity">
            {activity.map((a, i) => (
              <li key={i}>
                <span className={`act-dot ${a.c}`} />
                <div className="act-body">
                  <span className="act-t">{t(a.tKey)}</span>
                  <span className="act-s">{t(a.sKey)}</span>
                </div>
                <span className="act-time">{t(a.timeKey, { count: a.count })}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel ds-success">
          <div className="panel-head"><h3>{t("dashboard.successRate")}</h3></div>
          <div className="success-ring">
            <div className="ring">
              <span className="ring-val">98,7%</span>
            </div>
          </div>
          <div className="success-legend">
            <div><span className="lg lg-ok" /> {t("dashboard.successDelivered")} <b>3 218</b></div>
            <div><span className="lg lg-fail" /> {t("dashboard.successFailed")} <b>42</b></div>
          </div>
        </div>
      </div>
    </>
  );
}
