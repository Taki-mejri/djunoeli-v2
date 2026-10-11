import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import DataTable, { type Column } from "../../components/dashboard/DataTable";
import Toolbar from "../../components/dashboard/Toolbar";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { myInvoices, myInvoiceTone, type MyInvoice } from "../../lib/expediteurData";

export default function ExpInvoicesPage() {
  const { t } = useTranslation("expediteur");

  const columns: Column<MyInvoice>[] = [
    { key: "numero", label: t("invoices.table.number"), render: (r) => <b className="mono-cell">{r.numero}</b> },
    { key: "periode", label: t("invoices.table.period"), render: (r) => `${t(`mock.months.${r.periodeMonth}`)} ${r.periodeYear}` },
    { key: "date", label: t("invoices.table.issuedAt") },
    { key: "montant", label: t("invoices.table.amount"), align: "right", render: (r) => <span className="num-cell">{r.montant}</span> },
    { key: "statut", label: t("invoices.table.status"), render: (r) => <StatusBadge label={t(`invoices.status.${r.statut}`)} tone={myInvoiceTone[r.statut]} /> },
    { key: "actions", label: "", align: "right", render: () => (
      <button className="row-action" title={t("invoices.download")}><Download size={17} /></button>
    ) },
  ];

  return (
    <>
      <div className="ds-page-head">
        <div><h1>{t("invoices.title")}</h1><p>{t("invoices.subtitle")}</p></div>
      </div>
      <Toolbar searchPlaceholder={t("invoices.searchPlaceholder")} />
      <DataTable columns={columns} rows={myInvoices} footer={<span>{t("invoices.footer", { total: myInvoices.length })}</span>} />
    </>
  );
}
