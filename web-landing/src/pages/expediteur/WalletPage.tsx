import { useTranslation } from "react-i18next";
import {
  Wallet, ArrowUpRight, Gift, RotateCcw, Package, AlertCircle, Info,
} from "lucide-react";
import { useMyWallet, type WalletTx } from "../../lib/walletQueries";
import { formatEUR } from "../../lib/money";
import { dateLocaleTag } from "../../lib/dateLocale";

const TX_ICON: Record<string, typeof Wallet> = {
  CREDIT_ADMIN: ArrowUpRight,
  TOPUP_CARD: ArrowUpRight,
  BONUS: Gift,
  REFUND: RotateCcw,
  DEBIT_SHIPMENT: Package,
};

export default function WalletPage() {
  const { t, i18n } = useTranslation("wallet");
  const locale = dateLocaleTag(i18n.language);
  const { data, isLoading, isError } = useMyWallet();

  const txLabel = (tx: WalletTx) =>
    t(`txType.${tx.type}`, { defaultValue: tx.type });

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("exp.title")}</h1>
          <p>{t("exp.subtitle")}</p>
        </div>
      </div>

      {isError && <div className="api-err"><AlertCircle size={18} /> {t("exp.loadError")}</div>}

      {isLoading ? (
        <div className="api-loading">...</div>
      ) : data && (
        <>
          {/* Carte solde */}
          <div className="wl-hero">
            <div className="wl-hero-ic"><Wallet size={26} /></div>
            <div className="wl-hero-body">
              <span className="wl-hero-label">{t("exp.currentBalance")}</span>
              <span className="wl-hero-value">{formatEUR(data.balance)}</span>
            </div>
          </div>

          {/* Note recharge (Stripe viendra plus tard) */}
          <div className="wl-topup-note">
            <Info size={18} />
            <span>{t("exp.topupNote")}</span>
          </div>

          {/* Historique */}
          <h2 className="wl-section-title">{t("exp.history")}</h2>
          {data.transactions.length === 0 ? (
            <div className="empty-state">
              <Wallet size={40} strokeWidth={1.4} />
              <p>{t("exp.noTx")}</p>
            </div>
          ) : (
            <div className="wl-tx-list">
              {data.transactions.map((tx) => {
                const Icon = TX_ICON[tx.type] ?? Wallet;
                const credit = tx.amount >= 0;
                return (
                  <div className="wl-tx" key={tx.id}>
                    <div className={`wl-tx-ic ${credit ? "credit" : "debit"}`}>
                      <Icon size={16} />
                    </div>
                    <div className="wl-tx-body">
                      <b>{txLabel(tx)}</b>
                      {tx.note && <span>{tx.note}</span>}
                      <span className="wl-tx-date">
                        {new Date(tx.createdAt).toLocaleString(locale, {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="wl-tx-amount">
                      <b className={credit ? "credit" : "debit"}>
                        {credit ? "+" : ""}{formatEUR(tx.amount)}
                      </b>
                      <span>{formatEUR(tx.balanceAfter)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
