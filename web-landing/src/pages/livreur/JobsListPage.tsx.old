import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Package, AlertCircle, ChevronRight, MapPin, Wallet, Zap, AlertTriangle,
} from "lucide-react";
import { useMyJobs, type LivreurJobStatus } from "../../lib/jobQueries";
import { formatEUR } from "../../lib/money";

const statusClass: Record<LivreurJobStatus, string> = {
  AWAITING_PICKUP: "liv-b-wait",
  PICKED_UP: "liv-b-picked",
  AT_WAREHOUSE: "liv-b-picked",
  IN_TRANSIT: "liv-b-transit",
  OUT_FOR_DELIVERY: "liv-b-transit",
  DELIVERED: "liv-b-done",
  FAILED_DELIVERY: "liv-b-fail",
};

export default function JobsListPage() {
  const { t } = useTranslation("livreur");
  const { t: tc } = useTranslation("common");
  const { data, isLoading, isError, error } = useMyJobs();

  const total = data?.meta.total ?? 0;

  return (
    <div className="liv-page">
      <div className="liv-page-head">
        <h1>{t("jobs.title")}</h1>
        {/* Pluriel géré par i18next (activeCount_one / _other) */}
        <p>{t("jobs.activeCount", { count: total })}</p>
      </div>

      {isError && (
        <div className="api-err">
          <AlertCircle size={18} />
          {(error as Error)?.message ?? t("errors.load")}
        </div>
      )}

      {isLoading ? (
        <div className="api-loading">{tc("actions.loading")}</div>
      ) : data && data.data.length === 0 ? (
        <div className="liv-empty">
          <Package size={44} strokeWidth={1.4} />
          <h3>{t("jobs.empty")}</h3>
          <p>{t("jobs.emptyHint")}</p>
        </div>
      ) : (
        <div className="liv-jobs">
          {data?.data.map((job) => {
            const cod = Number(job.codAmount);
            return (
              <Link to={`/livreur/jobs/${job.id}`} className="liv-job-card" key={job.id}>
                <div className="liv-job-top">
                  <span className="mono-cell liv-job-trk">{job.trackingNumber}</span>
                  <span className={`liv-badge ${statusClass[job.status]}`}>
                    {tc(`status.${job.status}`)}
                  </span>
                </div>

                <div className="liv-job-receiver">
                  <b>{job.receiverName}</b>
                  <div className="liv-job-addr">
                    {/* Quartiers de Dortmund : jamais traduits */}
                    <MapPin size={13} /> {job.deliveryAddress}, {job.deliveryCity}
                  </div>
                </div>

                <div className="liv-job-tags">
                  {job.deliveryType === "EXPRESS" && (
                    <span className="liv-tag express"><Zap size={12} /> {t("tags.express")}</span>
                  )}
                  {job.isFragile && (
                    <span className="liv-tag fragile"><AlertTriangle size={12} /> {t("tags.fragile")}</span>
                  )}
                  {cod > 0 && (
                    <span className="liv-tag cod"><Wallet size={12} /> COD {formatEUR(cod)}</span>
                  )}
                </div>

                <ChevronRight size={20} className="liv-job-chevron" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
