import { MoreHorizontal } from "lucide-react";
import DataTable, { type Column } from "../../components/dashboard/DataTable";
import Toolbar from "../../components/dashboard/Toolbar";
import { customers, type Customer } from "../../lib/mockData";

const columns: Column<Customer>[] = [
  { key: "nom", label: "Client", render: (r) => (
    <div className="cell-user"><span className="cell-avatar">{r.nom.charAt(0)}</span><div><b>{r.nom}</b><span className="cell-sub">{r.tel}</span></div></div>
  ) },
  { key: "ville", label: "Ville" },
  { key: "commandes", label: "Commandes", align: "center" },
  { key: "total", label: "Total dépensé", align: "right", render: (r) => <span className="num-cell">{r.total}</span> },
  { key: "actions", label: "", align: "right", render: () => <button className="row-action"><MoreHorizontal size={18} /></button> },
];

export default function CustomersPage() {
  return (
    <>
      <div className="ds-page-head">
        <div><h1>Clients</h1><p>Les destinataires finaux de vos livraisons.</p></div>
        <button className="ds-btn-primary">Exporter les données</button>
      </div>
      <Toolbar searchPlaceholder="Rechercher un client..." />
      <DataTable columns={columns} rows={customers} footer={<span>{customers.length} clients</span>} />
    </>
  );
}
