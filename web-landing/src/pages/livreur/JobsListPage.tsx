import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import {
  Package, ScanLine, ChevronRight, MapPin, Zap, AlertTriangle, Check, X,
} from "lucide-react";
import { useMyJobs, usePickupScan } from "../../lib/jobQueriesV2";
import ExpressTimer from "../../components/livreur/ExpressTimer";

const statusClass: Record<string, string> = {
  ASSIGNED: "liv-b-wait",
  PICKED_UP: "liv-b-picked",
  OUT_FOR_DELIVERY: "liv-b-transit",
  DELIVERED: "liv-b-done",
  FAILED_DELIVERY: "liv-b-fail",
};

export default function JobsListPage() {
  const { t } = useTranslation("livreur");
  const { t: tc } = useTranslation("common");
  const { data, isLoading } = useMyJobs();
  const pickup = usePickupScan();
  const [scan, setScan] = useState("");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const flash = (t2: { kind: "ok" | "err"; msg: string }) => { setToast(t2); setTimeout(() => setToast(null), 2600); };

  const doScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const trk = scan.trim();
    if (!trk) return;
    try {
      const res = await pickup.mutateAsync(trk);
      // Message traduit côté client (celui du serveur est en français)
      const tracking = res.shipment.trackingNumber;
      flash({ kind: "ok", msg: res.isExpress ? t("scan.doneExpress", { tracking }) : t("scan.doneTrk", { tracking }) });
      setScan("");
    } catch (err) {
      const msg = isAxiosError(err) ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message : null;
      flash({ kind: "err", msg: msg ?? tc("common.error") });
    }
  };

  return (
    <div className="liv-page">
      <div className="liv-page-head">
        <h1>{t("jobs.title")}</h1>
        <p>{t("jobs.count", { count: data?.length ?? 0 })}</p>
      </div>

      {toast && (
        <div className={`liv-toast ${toast.kind}`}>
          {toast.kind === "ok" ? <Check size={16} /> : <X size={16} />} {toast.msg}
        </div>
      )}

      {/* Barre de scan ramassage */}
      <form className="liv-scanbar" onSubmit={doScan}>
        <ScanLine size={18} />
        <input value={scan} onChange={(e) => setScan(e.target.value)} placeholder={t("scan.placeholder")} autoComplete="off" spellCheck={false} />
        <button type="submit" disabled={pickup.isPending || !scan.trim()}>{pickup.isPending ? "..." : t("scan.pickup")}</button>
      </form>

      {isLoading ? (
        <div className="api-loading">{tc("actions.loading")}</div>
      ) : data && data.length === 0 ? (
        <div className="liv-empty">
          <Package size={44} strokeWidth={1.4} />
          <h3>{t("jobs.empty")}</h3>
          <p>{t("jobs.emptyHint")}</p>
        </div>
      ) : (
        <div className="liv-jobs">
          {data?.map((job) => {
            const isExpress = job.deliveryType === "EXPRESS";
            const active = job.status === "PICKED_UP" || job.status === "OUT_FOR_DELIVERY";
            return (
              <Link to={`/livreur/jobs/${job.id}`} className="liv-job-card" key={job.id}>
                <div className="liv-job-top">
                  <span className="mono-cell liv-job-trk">{job.trackingNumber}</span>
                  <span className={`liv-badge ${statusClass[job.status] ?? ""}`}>
                    {tc(`status.${job.status}`)}
                  </span>
                </div>
                <div className="liv-job-receiver">
                  <b>{job.receiverName}</b>
                  <div className="liv-job-addr"><MapPin size={13} /> {job.deliveryAddress}, {job.deliveryCity}</div>
                </div>
                <div className="liv-job-tags">
                  {isExpress && <span className="liv-tag express"><Zap size={12} /> Express</span>}
                  {job.isFragile && <span className="liv-tag fragile"><AlertTriangle size={12} /> {t("tags.fragile")}</span>}
                </div>
                {isExpress && active && job.slaDeadlineAt && (
                  <div className="liv-job-timer"><ExpressTimer slaDeadlineAt={job.slaDeadlineAt} size="sm" /></div>
                )}
                <ChevronRight size={20} className="liv-job-chevron" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
