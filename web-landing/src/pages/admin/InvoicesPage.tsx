import { Download, MoreHorizontal } from "lucide-react";
import DataTable, { type Column } from "../../components/dashboard/DataTable";
import Toolbar from "../../components/dashboard/Toolbar";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { invoices, invoiceTone, type Invoice } from "../../lib/mockData";

const columns: Column<Invoice>[] = [
  { key: "numero", label: "N° Facture", render: (r) => <b className="mono-cell">{r.numero}</b> },
  { key: "expediteur", label: "Expéditeur" },
  { key: "date", label: "Date" },
  { key: "montant", label: "Montant", align: "right", render: (r) => <span className="num-cell">{r.montant}</span> },
  { key: "statut", label: "Statut", render: (r) => <StatusBadge label={r.statut} tone={invoiceTone[r.statut]} /> },
  { key: "actions", label: "", align: "right", render: () => (
    <div className="row-actions"><button className="row-action"><Download size={17} /></button><button className="row-action"><MoreHorizontal size={18} /></button></div>
  ) },
];

export default function InvoicesPage() {
  return (
    <>
      <div className="ds-page-head">
        <div><h1>Factures</h1><p>Gérez la facturation des expéditeurs.</p></div>
        <button className="ds-btn-primary">+ Générer une facture</button>
      </div>
      <Toolbar searchPlaceholder="Rechercher une facture...">
        <select className="tbl-select"><option>Tous les statuts</option><option>Payée</option><option>En attente</option><option>En retard</option></select>
      </Toolbar>
      <DataTable columns={columns} rows={invoices} footer={<span>{invoices.length} factures</span>} />
    </>
  );
}
