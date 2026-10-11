import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Wallet, Building2, FileText, TrendingUp, AlertCircle,
  ArrowRight, Banknote, Coins,
} from "lucide-react";
import { useFinancialOverview } from "../../lib/financeQueries";

function money(n: number) {
  return `${n.toLocaleString("fr-FR")} DT`;
}

export default function FinanceHome() {
  const { t } = useTranslation("finance");
  const { t: tc } = useTranslation("common");
  const { data, isLoading, isError, error } = useFinancialOverview();

  if (isLoading) return <div className="api-loading">{tc("actions.loading")}</div>;
  if (isError) {
    return (
      <div className="api-err">
        <AlertCircle size={18} />
        {(error as Error)?.message ?? t("errors.load")}
      </div>
    );
  }
  if (!data) return null;

  const { revenue, cashPosition, invoicing } = data;

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("home.title")}</h1>
          <p>{t("home.subtitle")}</p>
        </div>
      </div>

      {/* CA */}
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

      {/* Position de trésorerie */}
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

      {/* Accès rapide */}
      <h2 className="fin-section-title">{t("home.actions")}</h2>
      <div className="fin-quick">
        <Link to="/finance/livreurs" className="fin-quick-card">
          <Wallet size={22} />
          <div>
            <h3>{t("home.collectLivreurs")}</h3>
            <p>{t("home.collectLivreursDesc")}</p>
          </div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/finance/expediteurs" className="fin-quick-card">
          <Building2 size={22} />
          <div>
            <h3>{t("home.remitExpediteurs")}</h3>
            <p>{t("home.remitExpediteursDesc")}</p>
          </div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/finance/factures" className="fin-quick-card">
          <FileText size={22} />
          <div>
            <h3>{t("home.manageInvoices")}</h3>
            <p>{t("home.manageInvoicesDesc")}</p>
          </div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/finance/rapports" className="fin-quick-card">
          <TrendingUp size={22} />
          <div>
            <h3>{t("home.viewReports")}</h3>
            <p>{t("home.viewReportsDesc")}</p>
          </div>
          <ArrowRight size={18} />
        </Link>
      </div>
    </>
  );
}
