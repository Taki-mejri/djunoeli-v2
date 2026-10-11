import { MapPin, Navigation } from "lucide-react";
import { drivers, driverTone } from "../../lib/mockData";

export default function TrackingPage() {
  const active = drivers.filter((d) => d.statut === "Occupé");
  return (
    <>
      <div className="ds-page-head">
        <div><h1>Suivi en direct</h1><p>Position des livreurs et colis actifs en temps réel.</p></div>
      </div>
      <div className="track-layout">
        <div className="track-map">
          <div className="map-placeholder">
            <MapPin size={34} />
            <h3>Carte en temps réel</h3>
            <p>La carte interactive (Leaflet / Mapbox) affichera ici les livreurs, entrepôts et colis actifs avec leur position GPS.</p>
          </div>
        </div>
        <div className="track-list panel">
          <div className="panel-head"><h3>Livreurs en course</h3></div>
          {active.map((d) => (
            <div className="track-item" key={d.nom}>
              <span className="track-pin"><Navigation size={16} /></span>
              <div className="track-info"><b>{d.nom}</b><span className="cell-sub">{d.zone} · {d.courses} colis</span></div>
              <span className={`sbadge sb-${driverTone[d.statut]}`}>{d.statut}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
