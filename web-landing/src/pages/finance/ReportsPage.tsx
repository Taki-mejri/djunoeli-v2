import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useFinancialOverview, useStatusBreakdown } from "../../lib/financeQueries";
import { formatEUR } from "../../lib/money";

function money(n: number) { return formatEUR(n); }

const PIE_COLORS = ["#1fc4a0", "#2563c9", "#b76e09", "#6d4bd0", "#0b7a63", "#d23744", "#8a99a8", "#e0a52e"];

export default function ReportsPage() {
  const { t } = useTranslation("finance");
  const { t: tc } = useTranslation("common");
  const { data: overview, isLoading, isError, error } = useFinancialOverview();
  const { data: breakdown } = useStatusBreakdown();

  if (isLoading) return <div className="api-loading">{tc("actions.loading")}</div>;
  if (isError) {
    return <div className="api-err"><AlertCircle size={18} /> {(error as Error)?.message ?? t("errors.generic")}</div>;
  }
  if (!overview) return null;

  /*
   * Données des graphes : recharts affiche `name` tel quel (axe X, légende,
   * étiquettes du camembert). On construit donc les séries DANS le composant
   * et on traduit `name` au moment du rendu — les libellés suivent ainsi la
   * bascule FR / DE au même titre que le reste de la page.
   */
  const cashData = [
    { name: t("reports.treasuryLabels.withLivreurs"), value: overview.cashPosition.heldByLivreurs },
    { name: t("reports.treasuryLabels.owedExpediteurs"), value: overview.cashPosition.owedToExpediteurs },
    { name: t("reports.treasuryLabels.commission"), value: overview.cashPosition.pendingCommission },
    { name: t("reports.treasuryLabels.invoicesDue"), value: overview.invoicing.unpaidAmount },
  ];

  // Statuts de colis : déjà traduits dans le namespace common (partagé)
  const pieData = (breakdown ?? []).map((b) => ({
    name: tc(`status.${b.status}`, { defaultValue: b.status }),
    value: b.count,
  }));

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("reports.title")}</h1>
          <p>{t("reports.subtitle")}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="fin-cards">
        <div className="fin-card">
          <span className="fin-card-value">{money(overview.revenue.total)}</span>
          <span className="fin-card-label">{t("reports.revenueTotal")}</span>
          <span className="fin-card-hint">{t("home.deliveries", { count: overview.revenue.totalDeliveries })}</span>
        </div>
        <div className="fin-card">
          <span className="fin-card-value">{money(overview.revenue.thisMonth)}</span>
          <span className="fin-card-label">{t("reports.revenueThisMonth")}</span>
          <span className="fin-card-hint">{t("home.deliveries", { count: overview.revenue.thisMonthDeliveries })}</span>
        </div>
        <div className="fin-card">
          <span className="fin-card-value">{money(overview.invoicing.paidThisMonth)}</span>
          <span className="fin-card-label">{t("reports.invoicesPaidMonth")}</span>
          <span className="fin-card-hint">{t("reports.invoicesCount", { count: overview.invoicing.paidThisMonthCount })}</span>
        </div>
        <div className="fin-card">
          <span className="fin-card-value">{money(overview.cashPosition.heldByLivreurs + overview.cashPosition.owedToExpediteurs)}</span>
          <span className="fin-card-label">{t("reports.cashInCirculation")}</span>
          <span className="fin-card-hint">{t("reports.toRegularize")}</span>
        </div>
      </div>

      {/* Graphes */}
      <div className="fin-charts">
        <div className="fin-chart-card">
          <h3>{t("reports.chartTreasury")}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cashData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Bar dataKey="value" fill="#1fc4a0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="fin-chart-card">
          <h3>{t("reports.chartShipments")}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry) => `${entry.name} (${entry.value})`}
                labelLine={false}
                fontSize={11}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
