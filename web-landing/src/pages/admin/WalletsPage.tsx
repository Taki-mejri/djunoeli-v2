import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Wallet, Plus, RotateCcw, Check, AlertCircle, Building2, Gift } from "lucide-react";
import { useWallets, type WalletRow } from "../../lib/walletQueries";
import { formatEUR } from "../../lib/money";
import CreditWalletModal from "../../components/admin/CreditWalletModal";

export default function WalletsPage() {
  const { t } = useTranslation("wallet");
  const { data, isLoading, isError } = useWallets();
  const [modal, setModal] = useState<{ mode: "credit" | "refund"; target: WalletRow } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const total = data?.reduce((s, w) => s + w.balance, 0) ?? 0;

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("admin.title")}</h1>
          <p>{t("admin.subtitle")}</p>
        </div>
      </div>

      {banner && <div className="wl-banner ok"><Check size={16} /> {banner}</div>}

      {data && (
        <div className="wl-stats">
          <div><span>{formatEUR(total)}</span><small>{t("admin.totalBalance")}</small></div>
          <div><span>{data.length}</span><small>{t("admin.shippers")}</small></div>
          <div><span>{data.filter((w) => !w.firstTopupDone).length}</span><small>{t("admin.noTopupYet")}</small></div>
        </div>
      )}

      {isError && <div className="api-err"><AlertCircle size={18} /> {t("admin.loadError")}</div>}

      {isLoading ? (
        <div className="api-loading">...</div>
      ) : (
        <div className="wl-rows">
          {data?.map((w) => (
            <div className="wl-row" key={w.expediteurId}>
              <div className="wl-avatar"><Building2 size={18} /></div>
              <div className="wl-row-info">
                <b>{w.companyName}</b>
                <span>{w.email}</span>
              </div>
              {!w.firstTopupDone && (
                <span className="wl-tag-bonus"><Gift size={12} /> {t("admin.bonusPending")}</span>
              )}
              <div className="wl-row-balance">
                <b className={w.balance <= 0 ? "zero" : ""}>{formatEUR(w.balance)}</b>
                <span>{t("admin.balance")}</span>
              </div>
              <div className="wl-row-actions">
                <button className="wl-btn-credit" onClick={() => setModal({ mode: "credit", target: w })}>
                  <Plus size={14} /> {t("admin.credit")}
                </button>
                <button className="wl-btn-refund" onClick={() => setModal({ mode: "refund", target: w })}>
                  <RotateCcw size={14} /> {t("admin.refund")}
                </button>
              </div>
            </div>
          ))}
          {data?.length === 0 && (
            <div className="empty-state">
              <Wallet size={44} strokeWidth={1.4} />
              <h3>{t("admin.empty")}</h3>
            </div>
          )}
        </div>
      )}

      <CreditWalletModal
        open={!!modal}
        mode={modal?.mode ?? "credit"}
        target={modal?.target ?? null}
        onClose={() => setModal(null)}
        onDone={(msg) => { setBanner(msg); setTimeout(() => setBanner(null), 5000); }}
      />
    </>
  );
}
