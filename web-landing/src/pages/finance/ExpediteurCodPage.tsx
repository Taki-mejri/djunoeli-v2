import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Building2, Check } from "lucide-react";
import {
  useExpediteurCod, useSettleExpediteur, useExpediteurSettlements,
  type ExpediteurCodRow,
} from "../../lib/financeQueries";
import SettleModal from "../../components/finance/SettleModal";
import { dateLocaleTag } from "../../lib/dateLocale";
import type { BannerText } from "../../lib/financeBanner";

function money(n: number) { return `${n.toLocaleString("fr-FR")} DT`; }

export default function ExpediteurCodPage() {
  const { t, i18n } = useTranslation("finance");
  const { t: tc } = useTranslation("common");
  const locale = dateLocaleTag(i18n.language);
  const { data, isLoading, isError, error } = useExpediteurCod();
  const { data: history } = useExpediteurSettlements();
  const settle = useSettleExpediteur();
  const [target, setTarget] = useState<ExpediteurCodRow | null>(null);
  const [banner, setBanner] = useState<BannerText | null>(null);

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("expediteurCod.title")}</h1>
          <p>{t("expediteurCod.subtitle")}</p>
        </div>
      </div>

      {banner && (
        <div className="fin-banner ok">
          <Check size={16} /> {"raw" in banner ? banner.raw : t(banner.key, banner.params ?? {})}
        </div>
      )}

      {data && (
        <div className="fin-mini-stats">
          <div><span>{money(data.summary.totalNetOwed)}</span><small>{t("expediteurCod.totalNetOwed")}</small></div>
          <div><span>{money(data.summary.totalGross)}</span><small>{t("expediteurCod.grossCod")}</small></div>
          <div><span>{money(data.summary.totalCommission)}</span><small>{t("expediteurCod.commissionHeld")}</small></div>
        </div>
      )}

      {isError && (
        <div className="api-err"><AlertCircle size={18} /> {(error as Error)?.message ?? t("errors.generic")}</div>
      )}

      {isLoading ? (
        <div className="api-loading">{tc("actions.loading")}</div>
      ) : (
        <div className="fin-rows">
          {data?.rows.map((r) => (
            <div className="fin-row" key={r.expediteurId}>
              <div className="fin-avatar building"><Building2 size={18} /></div>
              <div className="fin-row-info">
                <b>{r.companyName}</b>
                <span>
                  {t("expediteurCod.rowDetail", {
                    parcels: t("expediteurCod.parcelsCount", { count: r.shipmentCount }),
                    gross: money(r.grossCod),
                    commission: money(r.commission),
                  })}
                </span>
              </div>
              <div className="fin-row-amount">
                <b>{money(r.netOwed)}</b>
                <span>{t("expediteurCod.netToRemit")}</span>
              </div>
              <button className="fin-btn-collect" onClick={() => setTarget(r)}>
                {t("expediteurCod.remit")}
              </button>
            </div>
          ))}
          {data?.rows.length === 0 && (
            <div className="empty-state">
              <Building2 size={44} strokeWidth={1.4} />
              <h3>{t("expediteurCod.empty")}</h3>
              <p>{t("expediteurCod.emptyHint")}</p>
            </div>
          )}
        </div>
      )}

      {history && history.length > 0 && (
        <>
          <h2 className="fin-section-title">{t("expediteurCod.recentSettlements")}</h2>
          <div className="fin-history">
            {history.slice(0, 10).map((s) => (
              <div className="fin-hist-row" key={s.id}>
                <div className="fin-hist-ic exp"><Building2 size={15} /></div>
                <span className="fin-hist-name">{s.companyName}</span>
                <span className="fin-hist-method">
                  {money(s.grossCod)} − {money(s.commission)}
                </span>
                <span className="fin-hist-amount">{money(s.netAmount)}</span>
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
        title={t("settle.remitExpediteur")}
        subtitle={t("settle.remitExpediteurSub", { name: target?.companyName ?? "" })}
        defaultAmount={target?.netOwed ?? 0}
        allowPartial={false}
        onClose={() => setTarget(null)}
        onConfirm={async ({ method, reference }) => {
          if (!target) return;
          await settle.mutateAsync({ expediteurId: target.expediteurId, method, reference });
          setBanner({ key: "expediteurCod.settledOk" });
        }}
      />
    </>
  );
}
