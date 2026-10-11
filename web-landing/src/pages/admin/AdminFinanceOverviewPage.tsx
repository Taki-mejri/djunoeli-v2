import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Banknote, Building2, Coins, FileText, AlertCircle, ExternalLink,
  Wallet, TrendingUp,
} from "lucide-react";
import {
  useFinancialOverview, useLivreurBalances, useExpediteurCod,
} from "../../lib/financeQueries";
import { formatEUR } from "../../lib/money";

function money(n: number) { return formatEUR(n); }

/**
 * Vue de SUPERVISION financière pour l'admin, intégrée à son espace.
 * Lecture seule : pour agir (encaisser/reverser), l'admin va sur /finance.
 */
export default function AdminFinanceOverviewPage() {
  const { t } = useTranslation("finance");
  const { t: tc } = useTranslation("common");
  const { data: overview, isLoading, isError, error } = useFinancialOverview();
  const { data: livreurs } = useLivreurBalances();
  const { data: expediteurs } = useExpediteurCod();

  if (isLoading) return <div className="api-loading">{tc("actions.loading")}</div>;
  if (isError) {
    return <div className="api-err"><AlertCircle size={18} /> {(error as Error)?.message ?? t("errors.generic")}</div>;
  }
  if (!overview) return null;

  const { revenue, cashPosition, invoicing } = overview;

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("adminOverview.title")}</h1>
          <p>{t("adminOverview.subtitle")}</p>
        </div>
        <Link to="/finance" className="ds-btn-primary">
          <ExternalLink size={16} style={{ marginRight: 6 }} /> {t("adminOverview.openFinance")}
        </Link>
      </div>

      {/* Hero CA */}
      <div className="fin-hero">
        <div className="fin-hero-main">
          <span className="fin-hero-label">{t("home.revenueTotal")}</span>
          <span className="fin-hero-value">{money(revenue.total)}</span>
          <span className="fin-hero-sub">{t("home.deliveries", { count: revenue.totalDeliveries })}</span>
        </div>
        <div className="fin-hero-side">
          <span className="fin-hero-side-label">{t("home.thisMonth")}</span>
          <span className="fin-hero-side-value">{money(revenue.thisMonth)}</span>
          <span className="fin-hero-side-sub">{t("home.deliveries", { count: revenue.thisMonthDeliveries })}</span>
        </div>
      </div>

      {/* Position trésorerie */}
      <h2 className="fin-section-title">{t("home.treasuryPosition")}</h2>
      <div className="fin-cards">
        <div className="fin-card">
          <div className="fin-card-ic hold"><Banknote size={20} /></div>
          <span className="fin-card-value">{money(cashPosition.heldByLivreurs)}</span>
          <span className="fin-card-label">{t("home.cashWithLivreurs")}</span>
          <span className="fin-card-hint">{t("home.toCollect")}</span>
        </div>
        <div className="fin-card">
          <div className="fin-card-ic owe"><Building2 size={20} /></div>
          <span className="fin-card-value">{money(cashPosition.owedToExpediteurs)}</span>
          <span className="fin-card-label">{t("home.owedToExpediteurs")}</span>
          <span className="fin-card-hint">{t("home.netCodToRemit")}</span>
        </div>
        <div className="fin-card">
          <div className="fin-card-ic comm"><Coins size={20} /></div>
          <span className="fin-card-value">{money(cashPosition.pendingCommission)}</span>
          <span className="fin-card-label">{t("home.pendingCommission")}</span>
          <span className="fin-card-hint">{t("home.onUnsettledCod")}</span>
        </div>
        <div className="fin-card">
          <div className="fin-card-ic inv"><FileText size={20} /></div>
          <span className="fin-card-value">{money(invoicing.unpaidAmount)}</span>
          <span className="fin-card-label">{t("home.unpaidInvoices")}</span>
          <span className="fin-card-hint">{t("home.invoiceCount", { count: invoicing.unpaidCount })}</span>
        </div>
      </div>

      {/* Aperçu soldes livreurs (top 5) */}
      <div className="admin-fin-split">
        <div>
          <div className="admin-fin-head">
            <h2 className="fin-section-title" style={{ margin: 0 }}>
              <Wallet size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
              {t("adminOverview.livreurBalances")}
            </h2>
            <Link to="/finance/livreurs" className="admin-fin-link">{t("adminOverview.manage")}</Link>
          </div>
          <div className="fin-rows">
            {livreurs?.rows.filter((r) => r.codBalance > 0).slice(0, 5).map((r) => (
              <div className="fin-row compact" key={r.livreurId}>
                <div className="fin-row-info">
                  <b>{[r.firstName, r.lastName].filter(Boolean).join(" ") || t("livreurBalances.livreurFallback")}</b>
                  <span>{t("livreurBalances.deliveriesCount", { count: r.totalDeliveries })}</span>
                </div>
                <div className="fin-row-amount">
                  <b>{money(r.codBalance)}</b>
                </div>
              </div>
            ))}
            {livreurs?.rows.filter((r) => r.codBalance > 0).length === 0 && (
              <p className="cell-sub" style={{ padding: "12px 4px" }}>{t("adminOverview.emptyLivreurs")}</p>
            )}
          </div>
        </div>

        <div>
          <div className="admin-fin-head">
            <h2 className="fin-section-title" style={{ margin: 0 }}>
              <Building2 size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
              {t("adminOverview.expediteurCod")}
            </h2>
            <Link to="/finance/expediteurs" className="admin-fin-link">{t("adminOverview.manage")}</Link>
          </div>
          <div className="fin-rows">
            {expediteurs?.rows.slice(0, 5).map((r) => (
              <div className="fin-row compact" key={r.expediteurId}>
                <div className="fin-row-info">
                  <b>{r.companyName}</b>
                  <span>{t("expediteurCod.parcelsCount", { count: r.shipmentCount })}</span>
                </div>
                <div className="fin-row-amount">
                  <b>{money(r.netOwed)}</b>
                </div>
              </div>
            ))}
            {expediteurs?.rows.length === 0 && (
              <p className="cell-sub" style={{ padding: "12px 4px" }}>{t("adminOverview.emptyExpediteurs")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="admin-fin-cta">
        <TrendingUp size={18} />
        <span>{t("adminOverview.ctaText")}</span>
        <Link to="/finance/rapports" className="admin-fin-link">{t("adminOverview.ctaLink")}</Link>
      </div>
    </>
  );
}
