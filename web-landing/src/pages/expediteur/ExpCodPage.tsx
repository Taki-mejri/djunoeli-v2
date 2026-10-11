import { useTranslation } from "react-i18next";
import { Wallet, Clock, CheckCircle2 } from "lucide-react";
import DataTable, { type Column } from "../../components/dashboard/DataTable";
import Toolbar from "../../components/dashboard/Toolbar";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { myCod, myCodTone, type MyCod } from "../../lib/expediteurData";

export default function ExpCodPage() {
  const { t } = useTranslation("expediteur");

  const columns: Column<MyCod>[] = [
    { key: "tracking", label: t("table.tracking"), render: (r) => <b className="mono-cell">{r.tracking}</b> },
    { key: "destinataire", label: t("table.receiver") },
    { key: "date", label: t("table.date") },
    { key: "montant", label: t("table.amount"), align: "right", render: (r) => <span className="num-cell">{r.montant}</span> },
    { key: "statut", label: t("table.status"), render: (r) => <StatusBadge label={t(`cod.status.${r.statut}`)} tone={myCodTone[r.statut]} /> },
  ];

  return (
    <>
      <div className="ds-page-head">
        <div><h1>{t("cod.title")}</h1><p>{t("cod.subtitle")}</p></div>
      </div>

      <div className="cod-cards">
        <div className="cod-card">
          <span className="cod-ic t-amber"><Clock size={20} /></span>
          <div><span className="cod-label">{t("cod.cards.pending")}</span><span className="cod-value">231 DT</span></div>
        </div>
        <div className="cod-card">
          <span className="cod-ic t-green"><CheckCircle2 size={20} /></span>
          <div><span className="cod-label">{t("cod.cards.remittedMonth")}</span><span className="cod-value">218 DT</span></div>
        </div>
        <div className="cod-card">
          <span className="cod-ic t-navy"><Wallet size={20} /></span>
          <div><span className="cod-label">{t("cod.cards.totalToDate")}</span><span className="cod-value">3 480 DT</span></div>
        </div>
      </div>

      <Toolbar searchPlaceholder={t("cod.searchPlaceholder")}>
        <select className="tbl-select">
          <option>{t("cod.allStatuses")}</option>
          <option>{t("cod.status.collected")}</option>
          <option>{t("cod.status.remitted")}</option>
        </select>
      </Toolbar>
      <DataTable columns={columns} rows={myCod} footer={<span>{t("cod.footer", { total: myCod.length })}</span>} />
    </>
  );
}
