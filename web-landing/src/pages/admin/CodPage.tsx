import { Wallet, Clock, CheckCircle2 } from "lucide-react";
import DataTable, { type Column } from "../../components/dashboard/DataTable";
import Toolbar from "../../components/dashboard/Toolbar";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { codCollections, codTone, type Cod } from "../../lib/mockData";

const columns: Column<Cod>[] = [
  { key: "tracking", label: "N° Suivi", render: (r) => <b className="mono-cell">{r.tracking}</b> },
  { key: "livreur", label: "Livreur" },
  { key: "expediteur", label: "Expéditeur" },
  { key: "date", label: "Date" },
  { key: "montant", label: "Montant", align: "right", render: (r) => <span className="num-cell">{r.montant}</span> },
  { key: "statut", label: "Statut", render: (r) => <StatusBadge label={r.statut} tone={codTone[r.statut]} /> },
];

export default function CodPage() {
  return (
    <>
      <div className="ds-page-head">
        <div><h1>Paiement à la livraison (COD)</h1><p>Suivi et réconciliation des encaissements en espèces.</p></div>
        <button className="ds-btn-primary">Reverser aux expéditeurs</button>
      </div>

      <div className="cod-cards">
        <div className="cod-card">
          <span className="cod-ic t-amber"><Wallet size={20} /></span>
          <div><span className="cod-label">Total collecté</span><span className="cod-value">2 480 DT</span></div>
        </div>
        <div className="cod-card">
          <span className="cod-ic t-navy"><Clock size={20} /></span>
          <div><span className="cod-label">En attente de reversement</span><span className="cod-value">1 340 DT</span></div>
        </div>
        <div className="cod-card">
          <span className="cod-ic t-green"><CheckCircle2 size={20} /></span>
          <div><span className="cod-label">Reversé ce mois</span><span className="cod-value">1 140 DT</span></div>
        </div>
      </div>

      <Toolbar searchPlaceholder="Rechercher par n° de suivi ou livreur...">
        <select className="tbl-select"><option>Tous les statuts</option><option>Collecté</option><option>Reversé</option></select>
      </Toolbar>
      <DataTable columns={columns} rows={codCollections} footer={<span>{codCollections.length} transactions COD</span>} />
    </>
  );
}
