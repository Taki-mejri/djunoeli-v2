import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Wallet, Check } from "lucide-react";
import {
  useLivreurBalances, useSettleLivreur, useLivreurSettlements,
  type LivreurBalance,
} from "../../lib/financeQueries";
import SettleModal from "../../components/finance/SettleModal";
import { dateLocaleTag } from "../../lib/dateLocale";
import type { BannerText } from "../../lib/financeBanner";
import { timeAgoKey } from "../../lib/timeAgo";

function money(n: number) { return `${n.toLocaleString("fr-FR")} DT`; }
function initials(f: string | null, l: string | null) {
  return [(f ?? "").charAt(0), (l ?? "").charAt(0)].join("").toUpperCase() || "?";
}

export default function LivreurBalancesPage() {
  const { t, i18n } = useTranslation("finance");
  const { t: tc } = useTranslation("common");
  const locale = dateLocaleTag(i18n.language);
  const { data, isLoading, isError, error } = useLivreurBalances();
  const { data: history } = useLivreurSettlements();
  const settle = useSettleLivreur();
  const [target, setTarget] = useState<LivreurBalance | null>(null);
  const [banner, setBanner] = useState<BannerText | null>(null);

  const timeAgo = (iso: string | null) => {
    const { key, params } = timeAgoKey(iso);
    return t(key, params ?? {});
  };

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("livreurBalances.title")}</h1>
          <p>{t("livreurBalances.subtitle")}</p>
        </div>
      </div>

      {banner && (
        <div className="fin-banner ok">
          <Check size={16} /> {"raw" in banner ? banner.raw : t(banner.key, banner.params ?? {})}
        </div>
      )}

      {data && (
        <div className="fin-mini-stats">
          <div><span>{money(data.summary.totalToCollect)}</span><small>{t("livreurBalances.totalToCollect")}</small></div>
          <div><span>{money(data.summary.settledThisMonth)}</span><small>{t("livreurBalances.settledThisMonth")}</small></div>
          <div><span>{data.summary.livreursWithBalance}</span><small>{t("livreurBalances.livreursWithBalance")}</small></div>
        </div>
      )}

      {isError && (
        <div className="api-err"><AlertCircle size={18} /> {(error as Error)?.message ?? t("errors.generic")}</div>
      )}

      {isLoading ? (
        <div className="api-loading">{tc("actions.loading")}</div>
      ) : (
        <div className="fin-rows">
          {data?.rows.filter((r) => r.codBalance > 0).map((r) => (
            <div className="fin-row" key={r.livreurId}>
              <div className="fin-avatar">{initials(r.firstName, r.lastName)}</div>
              <div className="fin-row-info">
                <b>{[r.firstName, r.lastName].filter(Boolean).join(" ") || t("livreurBalances.livreurFallback")}</b>
                <span>
                  {t("livreurBalances.deliveriesCount", { count: r.totalDeliveries })}
                  {" · "}
                  {t("livreurBalances.lastSettlement", { time: timeAgo(r.lastSettlementAt) })}
                </span>
              </div>
              <div className="fin-row-amount">
                <b>{money(r.codBalance)}</b>
                <span>{t("livreurBalances.toRemit")}</span>
              </div>
              <button className="fin-btn-collect" onClick={() => setTarget(r)}>
                {t("livreurBalances.collect")}
              </button>
            </div>
          ))}
          {data?.rows.filter((r) => r.codBalance > 0).length === 0 && (
            <div className="empty-state">
              <Wallet size={44} strokeWidth={1.4} />
              <h3>{t("livreurBalances.empty")}</h3>
              <p>{t("livreurBalances.emptyHint")}</p>
            </div>
          )}
        </div>
      )}

      {/* Historique récent */}
      {history && history.length > 0 && (
        <>
          <h2 className="fin-section-title">{t("livreurBalances.recentSettlements")}</h2>
          <div className="fin-history">
            {history.slice(0, 10).map((s) => (
              <div className="fin-hist-row" key={s.id}>
                <div className="fin-hist-ic"><Wallet size={15} /></div>
                <span className="fin-hist-name">{s.livreurName}</span>
                <span className="fin-hist-method">
                  {s.method ? t(`methods.${s.method}`, { defaultValue: s.method }) : "—"}
                </span>
                <span className="fin-hist-amount">{money(s.amount)}</span>
                <span className="fin-hist-date">
                  {new Date(s.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <SettleModal
        open={!!target}
        title={t("settle.collectLivreur")}
        subtitle={t("settle.collectLivreurSub", {
          name: [target?.firstName, target?.lastName].filter(Boolean).join(" "),
        })}
        defaultAmount={target?.codBalance ?? 0}
        allowPartial
        onClose={() => setTarget(null)}
        onConfirm={async ({ amount, method, reference }) => {
          if (!target) return;
          await settle.mutateAsync({ livreurId: target.livreurId, amount, method, reference });
          setBanner({ key: "livreurBalances.settledOk" });
        }}
      />
    </>
  );
}
