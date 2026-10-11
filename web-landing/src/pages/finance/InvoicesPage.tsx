import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, FileText, Check, Plus } from "lucide-react";
import {
  useInvoices, usePayInvoice, useGenerateInvoice, useExpediteurCod,
  type Invoice,
} from "../../lib/financeQueries";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { dateLocaleTag } from "../../lib/dateLocale";
import { bannerFromError, type BannerText } from "../../lib/financeBanner";
import { formatEUR } from "../../lib/money";

function money(n: number) { return formatEUR(n); }

const statusTone: Record<string, "green" | "gray" | "red" | "amber"> = {
  PAID: "green",
  UNPAID: "amber",
  PENDING: "amber",
  DRAFT: "gray",
  OVERDUE: "red",
  CANCELLED: "red",
};

/** Onglets de filtre : la valeur envoyée à l'API + la clé de son libellé */
const TABS = [
  { value: "", labelKey: "invoices.tabAll" },
  { value: "UNPAID", labelKey: "invoices.tabUnpaid" },
  { value: "PAID", labelKey: "invoices.tabPaid" },
];

export default function InvoicesPage() {
  const { t, i18n } = useTranslation("finance");
  const { t: tc } = useTranslation("common");
  const locale = dateLocaleTag(i18n.language);
  const [filter, setFilter] = useState<string>("");
  const { data, isLoading, isError, error } = useInvoices(filter || undefined);
  const { data: codData } = useExpediteurCod();
  const pay = usePayInvoice();
  const generate = useGenerateInvoice();
  const [banner, setBanner] = useState<BannerText | null>(null);
  const [showGen, setShowGen] = useState(false);

  const handlePay = async (inv: Invoice) => {
    setBanner(null);
    try {
      await pay.mutateAsync({ id: inv.id, method: "BANK_TRANSFER" });
      setBanner({ key: "invoices.paidOk" });
    } catch (err) {
      setBanner(bannerFromError(err, "errors.generic"));
    }
  };

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("invoices.title")}</h1>
          <p>{t("invoices.subtitle")}</p>
        </div>
        <button className="ds-btn-primary" onClick={() => setShowGen(!showGen)}>
          <Plus size={16} style={{ marginRight: 4 }} /> {t("invoices.generate")}
        </button>
      </div>

      {banner && (
        <div className="fin-banner ok">
          <Check size={16} /> {"raw" in banner ? banner.raw : t(banner.key, banner.params ?? {})}
        </div>
      )}

      {/* Panneau génération */}
      {showGen && (
        <div className="fin-gen-panel">
          <h3>{t("invoices.generatePanelTitle")}</h3>
          <p>{t("invoices.generatePanelHint")}</p>
          <div className="fin-gen-list">
            {codData?.rows.length === 0 && (
              <span className="cell-sub">{t("invoices.generateTip")}</span>
            )}
            <GenerateForm
              onGenerate={async (expediteurId) => {
                setBanner(null);
                try {
                  await generate.mutateAsync({ expediteurId });
                  setBanner({ key: "invoices.generatedOk" });
                  setShowGen(false);
                } catch (err) {
                  setBanner(bannerFromError(err, "errors.generic"));
                }
              }}
              pending={generate.isPending}
            />
          </div>
        </div>
      )}

      <div className="fin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.value || "all"}
            className={`fin-tab ${filter === tab.value ? "active" : ""}`}
            onClick={() => setFilter(tab.value)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {isError && (
        <div className="api-err"><AlertCircle size={18} /> {(error as Error)?.message ?? t("errors.generic")}</div>
      )}

      {isLoading ? (
        <div className="api-loading">{tc("actions.loading")}</div>
      ) : data && data.length === 0 ? (
        <div className="empty-state">
          <FileText size={44} strokeWidth={1.4} />
          <h3>{t("invoices.empty")}</h3>
          <p>{t("invoices.emptyHint")}</p>
        </div>
      ) : (
        <div className="fin-invoices">
          {data?.map((inv) => (
            <div className="fin-inv-row" key={inv.id}>
              <div className="fin-inv-num">
                <FileText size={16} />
                <b className="mono-cell">{inv.number}</b>
              </div>
              <span className="fin-inv-company">{inv.companyName}</span>
              <span className="fin-inv-amount">{money(inv.amount)}</span>
              <StatusBadge
                label={t(`invoices.status.${inv.status}`, { defaultValue: inv.status })}
                tone={statusTone[inv.status] ?? "gray"}
              />
              <span className="fin-inv-date">
                {new Date(inv.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              {inv.status !== "PAID" && inv.status !== "CANCELLED" ? (
                <button className="fin-btn-pay" onClick={() => handlePay(inv)} disabled={pay.isPending}>
                  {t("invoices.markPaid")}
                </button>
              ) : (
                <span className="fin-inv-paid">
                  {inv.status === "PAID" ? <><Check size={13} /> {t("invoices.paid")}</> : "—"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* Petit formulaire de génération : liste les expéditeurs candidats */
function GenerateForm({ onGenerate, pending }: { onGenerate: (id: string) => void; pending: boolean }) {
  const { t } = useTranslation("finance");
  const [expediteurId, setExpediteurId] = useState("");
  const { data: codData } = useExpediteurCod();

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div className="set-field" style={{ flex: 1, minWidth: 220 }}>
        <label>{t("invoices.expediteurId")}</label>
        <input
          value={expediteurId}
          onChange={(e) => setExpediteurId(e.target.value)}
          placeholder={t("invoices.expediteurIdPlaceholder")}
          list="exp-suggestions"
        />
        <datalist id="exp-suggestions">
          {codData?.rows.map((r) => (
            <option key={r.expediteurId} value={r.expediteurId}>{r.companyName}</option>
          ))}
        </datalist>
      </div>
      <button
        className="ds-btn-primary"
        onClick={() => expediteurId && onGenerate(expediteurId)}
        disabled={pending || !expediteurId}
      >
        {pending ? t("invoices.generating") : t("invoices.generateBtn")}
      </button>
    </div>
  );
}
