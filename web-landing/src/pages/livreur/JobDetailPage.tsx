import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import {
  ArrowLeft, Phone, MapPin, Package, Zap, AlertTriangle, Check, X,
  Truck, PackageCheck, Store,
} from "lucide-react";
import { useMyJobs, usePickupScan, useAdvanceDelivery, type Job, type JobActionResult } from "../../lib/jobQueriesV2";
import ExpressTimer from "../../components/livreur/ExpressTimer";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("livreur");
  const { t: tc } = useTranslation("common");
  const { data, isLoading } = useMyJobs();
  // Dernier état renvoyé par une action : une course livrée/échouée sort de la
  // liste des courses ACTIVES, on garde donc ce snapshot pour afficher l'état
  // final (chrono figé « pünktlich/verspätet », bandeau terminé).
  const [snapshot, setSnapshot] = useState<Job | null>(null);
  const job: Job | undefined = data?.find((j) => j.id === id) ?? (snapshot && snapshot.id === id ? snapshot : undefined);

  const pickup = usePickupScan();
  const advance = useAdvanceDelivery();
  const [showFail, setShowFail] = useState(false);
  const [reason, setReason] = useState("");
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  if (!job) {
    return (
      <div className="liv-page">
        <Link to="/livreur/jobs" className="liv-back"><ArrowLeft size={16} /> {t("detail.back")}</Link>
        <div className="api-loading">{isLoading ? tc("actions.loading") : t("detail.notFound")}</div>
      </div>
    );
  }

  const isExpress = job.deliveryType === "EXPRESS";
  const errMsg = (err: unknown) =>
    isAxiosError(err) ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message ?? tc("common.error") : tc("common.error");

  const doPickup = async () => {
    setBanner(null);
    try {
      const res = await pickup.mutateAsync(job.trackingNumber);
      setSnapshot(res.shipment);
      const tracking = res.shipment.trackingNumber;
      setBanner({ kind: "ok", msg: res.isExpress ? t("scan.doneExpress", { tracking }) : t("scan.doneTrk", { tracking }) });
    } catch (err) { setBanner({ kind: "err", msg: errMsg(err) }); }
  };

  const doAdvance = async (status: "OUT_FOR_DELIVERY" | "DELIVERED", r?: string) => {
    setBanner(null);
    try {
      const res: JobActionResult = await advance.mutateAsync({ id: job.id, status, reason: r });
      setSnapshot(res.shipment);
      setBanner({
        kind: "ok",
        msg: status === "DELIVERED"
          ? t("detail.nowDelivered", { tracking: res.shipment.trackingNumber })
          : t("detail.nowOnTheWay", { name: res.shipment.receiverName }),
      });
    } catch (err) { setBanner({ kind: "err", msg: errMsg(err) }); }
  };

  const doFail = async () => {
    if (reason.trim().length < 3) return;
    setBanner(null);
    try {
      const res = await advance.mutateAsync({ id: job.id, status: "FAILED_DELIVERY", reason: reason.trim() });
      setSnapshot(res.shipment);
      setShowFail(false);
      setBanner({ kind: "err", msg: t("fail.recorded") });
    } catch (err) { setBanner({ kind: "err", msg: errMsg(err) }); }
  };

  const terminal = job.status === "DELIVERED" || job.status === "FAILED_DELIVERY";

  return (
    <div className="liv-page">
      <Link to="/livreur/jobs" className="liv-back"><ArrowLeft size={16} /> {t("detail.back")}</Link>

      <div className="liv-detail-head">
        <span className="mono-cell liv-detail-trk">{job.trackingNumber}</span>
        <span className={`liv-badge liv-b-${job.status === "DELIVERED" ? "done" : job.status === "FAILED_DELIVERY" ? "fail" : "transit"}`}>
          {tc(`status.${job.status}`)}
        </span>
      </div>

      {/* Chrono Express */}
      {isExpress && job.slaDeadlineAt && job.status !== "FAILED_DELIVERY" && (
        <div className="liv-express-banner">
          <ExpressTimer slaDeadlineAt={job.slaDeadlineAt} slaBreached={job.slaBreached} delivered={job.status === "DELIVERED"} size="lg" />
        </div>
      )}

      {banner && (
        <div className={`liv-banner ${banner.kind === "ok" ? "ok" : "err"}`}>
          {banner.kind === "ok" ? <Check size={16} /> : <X size={16} />} {banner.msg}
        </div>
      )}

      {/* Magasin à ramasser (si pas encore ramassé) */}
      {job.status === "ASSIGNED" && (
        <div className="liv-card">
          <div className="liv-card-label"><Store size={13} /> {t("detail.pickupAt")}</div>
          <div className="liv-receiver-name">{job.senderName ?? "—"}</div>
          {job.pickupAddress && <div className="liv-addr-full"><MapPin size={15} /> {job.pickupAddress}, {job.pickupCity}</div>}
          <div className="liv-contact-actions">
            {job.senderPhone && (
              <a href={`tel:${job.senderPhone}`} className="liv-contact-btn call">
                <Phone size={16} /> {t("detail.callStore")}
              </a>
            )}
            <a href={`https://maps.google.com/?q=${encodeURIComponent(job.pickupAddress + ", " + job.pickupCity + ", Dortmund")}`} target="_blank" rel="noopener noreferrer" className="liv-contact-btn map"><MapPin size={16} /> {t("detail.map")}</a>
          </div>
        </div>
      )}

      {/* Destinataire */}
      <div className="liv-card">
        <div className="liv-card-label">{t("detail.receiver")}</div>
        <div className="liv-receiver-name">{job.receiverName}</div>
        <div className="liv-addr-full"><MapPin size={15} /> {job.deliveryAddress}, {job.deliveryCity}</div>
        <div className="liv-contact-actions">
          <a href={`tel:${job.receiverPhone}`} className="liv-contact-btn call"><Phone size={16} /> {t("detail.call")}</a>
          <a href={`https://maps.google.com/?q=${encodeURIComponent((job.deliveryAddress ?? "") + ", " + job.deliveryCity + ", Dortmund")}`} target="_blank" rel="noopener noreferrer" className="liv-contact-btn map"><MapPin size={16} /> {t("detail.map")}</a>
        </div>
      </div>

      {/* Tags */}
      <div className="liv-card">
        <div className="liv-card-label">{t("detail.package")}</div>
        <div className="liv-tags-row">
          <span className={`liv-tag ${isExpress ? "express" : "std"}`}>{isExpress ? <><Zap size={12} /> Express</> : t("tags.standard")}</span>
          {job.isFragile && <span className="liv-tag fragile"><AlertTriangle size={12} /> {t("tags.fragile")}</span>}
        </div>
        {job.description && <p className="liv-addr-full" style={{ marginTop: 10 }}><Package size={15} /> {job.description}</p>}
      </div>

      {/* Barre d'action */}
      {!terminal && (
        <div className="liv-action-bar">
          {job.status === "ASSIGNED" && (
            <button className="liv-btn-main" onClick={doPickup} disabled={pickup.isPending}>
              <PackageCheck size={18} /> {pickup.isPending ? "..." : t("actions.confirmPickup")}
            </button>
          )}
          {job.status === "PICKED_UP" && (
            <button className="liv-btn-main" onClick={() => doAdvance("OUT_FOR_DELIVERY")} disabled={advance.isPending}>
              <Truck size={18} /> {t("actions.startDelivery")}
            </button>
          )}
          {job.status === "OUT_FOR_DELIVERY" && (
            <button className="liv-btn-main" onClick={() => doAdvance("DELIVERED")} disabled={advance.isPending}>
              <Check size={18} /> {t("actions.markDelivered")}
            </button>
          )}
          {(job.status === "PICKED_UP" || job.status === "OUT_FOR_DELIVERY") && (
            <button className="liv-btn-fail" onClick={() => setShowFail(true)} disabled={advance.isPending}>
              <AlertTriangle size={16} /> {t("actions.reportFailure")}
            </button>
          )}
        </div>
      )}

      {terminal && (
        <div className={`liv-terminal ${job.status === "DELIVERED" ? "ok" : "fail"}`}>
          {job.status === "DELIVERED" ? <><Check size={18} /> {t("detail.terminalDelivered")}</> : <><AlertTriangle size={18} /> {t("detail.terminalFailed")}</>}
        </div>
      )}

      {/* Modale échec */}
      {showFail && (
        <div className="liv-overlay" onClick={(e) => e.target === e.currentTarget && setShowFail(false)}>
          <div className="liv-sheet">
            <button className="liv-sheet-close" onClick={() => setShowFail(false)}><X size={18} /></button>
            <div className="liv-sheet-ic fail"><AlertTriangle size={26} /></div>
            <h3>{t("fail.title")}</h3>
            <p className="liv-sheet-sub">{t("fail.subtitle")}</p>
            <textarea className="liv-textarea" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} placeholder={t("fail.placeholder")} />
            <div className="liv-sheet-actions">
              <button className="liv-btn-ghost" onClick={() => setShowFail(false)}>{tc("actions.cancel")}</button>
              <button className="liv-btn-danger" onClick={doFail} disabled={advance.isPending || reason.trim().length < 3}>
                {advance.isPending ? "..." : t("fail.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
