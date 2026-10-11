import { UserPlus } from "lucide-react";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { unassigned, shipmentTone } from "../../lib/mockData";

export default function AssignmentsPage() {
  return (
    <>
      <div className="ds-page-head">
        <div><h1>Centre d'assignation</h1><p>{unassigned.length} colis en attente d'un livreur.</p></div>
        <button className="ds-btn-primary">Assignation automatique</button>
      </div>

      <div className="assign-grid">
        {unassigned.map((s) => (
          <div className="assign-card" key={s.tracking}>
            <div className="assign-top">
              <b className="mono-cell">{s.tracking}</b>
              <StatusBadge label={s.statut} tone={shipmentTone[s.statut]} />
            </div>
            <div className="assign-route">
              <div><span className="ar-label">Ramassage</span><span className="ar-val">{s.expediteur} · {s.ville}</span></div>
              <div className="ar-arrow">→</div>
              <div><span className="ar-label">Destination</span><span className="ar-val">{s.destinataire}</span></div>
            </div>
            <button className="assign-btn"><UserPlus size={16} /> Assigner un livreur</button>
          </div>
        ))}
      </div>
    </>
  );
}
