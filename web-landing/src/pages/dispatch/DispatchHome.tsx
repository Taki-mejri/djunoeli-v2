import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  PackagePlus, ArrowDownWideNarrow, TruckElectric, Warehouse,
  AlertCircle, ArrowRight,
} from "lucide-react";
import { useDispatcherStats } from "../../lib/dispatcherQueries";

export default function DispatchHome() {
  const { t } = useTranslation("dispatch");
  const { t: tc } = useTranslation("common");
  const { data, isLoading, isError, error } = useDispatcherStats();

  if (isLoading) return <div className="api-loading">{tc("actions.loading")}</div>;

  if (isError) {
    return (
      <div className="api-err">
        <AlertCircle size={18} />
        {(error as Error)?.message ?? t("errors.load")}
      </div>
    );
  }

  if (!data) return null;

  const { dispatcher, today, overall } = data;
  // Nom et ville du dépôt : données métier, jamais traduites
  const warehouseName = dispatcher.warehouse?.name ?? t("home.defaultWarehouse");

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("home.title")}</h1>
          <p>
            {warehouseName}
            {dispatcher.warehouse?.city ? ` · ${dispatcher.warehouse.city}` : ""} — {t("home.todayActivity")}.
          </p>
        </div>
      </div>

      {/* Stats du jour */}
      <div className="dsp-stats">
        <div className="dsp-stat">
          <div className="dsp-stat-ic recv"><PackagePlus size={20} /></div>
          <div>
            <span className="dsp-stat-num">{today.received}</span>
            <span className="dsp-stat-label">{t("home.stats.receivedToday")}</span>
          </div>
        </div>
        <div className="dsp-stat">
          <div className="dsp-stat-ic sort"><ArrowDownWideNarrow size={20} /></div>
          <div>
            <span className="dsp-stat-num">{today.sorted}</span>
            <span className="dsp-stat-label">{t("home.stats.sortedToday")}</span>
          </div>
        </div>
        <div className="dsp-stat">
          <div className="dsp-stat-ic assign"><TruckElectric size={20} /></div>
          <div>
            <span className="dsp-stat-num">{today.assigned}</span>
            <span className="dsp-stat-label">{t("home.stats.handedOver")}</span>
          </div>
        </div>
        <div className="dsp-stat">
          <div className="dsp-stat-ic ware"><Warehouse size={20} /></div>
          <div>
            <span className="dsp-stat-num">{overall.atWarehouseTotal}</span>
            <span className="dsp-stat-label">{t("home.stats.atWarehouseTotal")}</span>
          </div>
        </div>
      </div>

      {/* Accès rapide aux 3 stations */}
      <h2 className="dsp-section-title">{t("home.scanStations")}</h2>
      <div className="dsp-stations">
        <Link to="/dispatch/reception" className="dsp-station-card recv">
          <PackagePlus size={26} />
          <h3>{t("home.stationReception")}</h3>
          <p>{t("home.stationReceptionDesc")}</p>
          <span className="dsp-station-go">{t("home.open")} <ArrowRight size={15} /></span>
        </Link>
        <Link to="/dispatch/tri" className="dsp-station-card sort">
          <ArrowDownWideNarrow size={26} />
          <h3>{t("nav.sorting")}</h3>
          <p>{t("home.stationSortingDesc")}</p>
          <span className="dsp-station-go">{t("home.open")} <ArrowRight size={15} /></span>
        </Link>
        <Link to="/dispatch/assignation" className="dsp-station-card assign">
          <TruckElectric size={26} />
          <h3>{t("nav.assignment")}</h3>
          <p>{t("home.stationAssignmentDesc")}</p>
          <span className="dsp-station-go">{t("home.open")} <ArrowRight size={15} /></span>
        </Link>
      </div>
    </>
  );
}
