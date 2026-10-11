import { Warehouse as WhIcon } from "lucide-react";
import { warehouses } from "../../lib/mockData";

export default function WarehousesPage() {
  return (
    <>
      <div className="ds-page-head">
        <div><h1>Entrepôts</h1><p>Vos hubs régionaux et leur capacité.</p></div>
        <button className="ds-btn-primary">+ Ajouter un entrepôt</button>
      </div>
      <div className="wh-grid">
        {warehouses.map((w) => {
          const pct = Math.round((w.colis / parseInt(w.capacite.replace(/\s/g, ""))) * 100);
          return (
            <div className="wh-card" key={w.nom}>
              <span className="wh-ic"><WhIcon size={22} /></span>
              <h3>{w.nom}</h3>
              <p className="cell-sub">{w.ville}</p>
              <div className="wh-bar"><div className="wh-fill" style={{ width: pct + "%" }} /></div>
              <div className="wh-stat"><span>{w.colis} colis</span><span>{pct}% · cap. {w.capacite}</span></div>
            </div>
          );
        })}
      </div>
    </>
  );
}
