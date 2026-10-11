import { MoreHorizontal } from "lucide-react";
import DataTable, { type Column } from "../../components/dashboard/DataTable";
import Toolbar from "../../components/dashboard/Toolbar";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { tickets, ticketTone, type Ticket } from "../../lib/mockData";

const prioTone = { "Haute": "red", "Moyenne": "amber", "Basse": "gray" } as const;

const columns: Column<Ticket>[] = [
  { key: "id", label: "ID", render: (r) => <b className="mono-cell">{r.id}</b> },
  { key: "sujet", label: "Sujet" },
  { key: "auteur", label: "Auteur" },
  { key: "priorite", label: "Priorité", render: (r) => <StatusBadge label={r.priorite} tone={prioTone[r.priorite]} /> },
  { key: "statut", label: "Statut", render: (r) => <StatusBadge label={r.statut} tone={ticketTone[r.statut]} /> },
  { key: "date", label: "Date" },
  { key: "actions", label: "", align: "right", render: () => <button className="row-action"><MoreHorizontal size={18} /></button> },
];

export default function SupportPage() {
  return (
    <>
      <div className="ds-page-head">
        <div><h1>Support</h1><p>Tickets clients et livreurs.</p></div>
        <button className="ds-btn-primary">+ Nouveau ticket</button>
      </div>
      <Toolbar searchPlaceholder="Rechercher un ticket...">
        <select className="tbl-select"><option>Tous</option><option>Ouvert</option><option>En cours</option><option>Résolu</option></select>
      </Toolbar>
      <DataTable columns={columns} rows={tickets} footer={<span>{tickets.length} tickets</span>} />
    </>
  );
}
