import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import {
  ArrowLeft, Phone, MapPin, Package, Wallet, Zap, AlertTriangle,
  AlertCircle, Check, Truck, PhoneCall, X,
} from "lucide-react";
import {
  useJob, useAdvanceJob, useLogCall,
  nextAction,
  type CallOutcome, type LivreurJobStatus,
} from "../../lib/jobQueries";
import FailureModal from "../../components/livreur/FailureModal";
import DeliveryConfirmModal from "../../components/livreur/DeliveryConfirmModal";
import { dateLocaleTag } from "../../lib/dateLocale";
import { serverNoteKey } from "../../lib/serverNotes";

/**
 * Bandeau de retour : on ne stocke jamais un texte figé, mais soit une CLÉ i18n
 * (+ ses paramètres), soit le message brut renvoyé par le backend. Le bandeau
 * se re-traduit donc tout seul si le livreur change de langue.
 */
type Banner =
  | { kind: "ok" | "err"; key: string; params?: Record<string, string> }
  | { kind: "ok" | "err"; raw: string };

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation("livreur");
  const { t: tc } = useTranslation("common");
  const locale = dateLocaleTag(i18n.language);
  const { data: job, isLoading, isError, error } = useJob(id);
  const advance = useAdvanceJob(id ?? "");
  const call = useLogCall(id ?? "");

  const [showFail, setShowFail] = useState(false);
  const [showDeliver, setShowDeliver] = useState(false);
  const [showCallSheet, setShowCallSheet] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);

  /** Extrait le message d'erreur du backend, sinon null */
  const serverMessage = (err: unknown): string | null =>
    isAxiosError(err)
      ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message ?? null
      : null;

  if (isLoading) {
    return <div className="liv-page"><div className="api-loading">{tc("actions.loading")}</div></div>;
  }

  if (isError || !job) {
    return (
      <div className="liv-page">
        <div className="api-err">
          <AlertCircle size={18} />
          {(error as Error)?.message ?? t("errors.jobNotFound")}
        </div>
        <Link to="/livreur/jobs" className="liv-btn-ghost" style={{ marginTop: 16 }}>
          {t("detail.backToJobs")}
        </Link>
      </div>
    );
  }

  const cod = Number(job.codAmount);
  const action = nextAction[job.status];
  const isTerminal = job.status === "DELIVERED" || job.status === "FAILED_DELIVERY";

  /** Traduit une note système connue du journal, sinon renvoie le texte brut */
  const noteText = (note: string) => {
    const key = serverNoteKey(note);
    return key ? tc(key) : note;
  };

  const doAdvance = async (target: typeof action, codCollected?: boolean) => {
    if (!target) return;
    setBanner(null);
    try {
      await advance.mutateAsync({ status: target.target, codCollected });
      setShowDeliver(false);
      if (target.target === "DELIVERED") {
        setBanner({ kind: "ok", key: "delivery.success" });
      } else {
        // Le statut est passé en paramètre : il sera traduit au rendu
        setBanner({ kind: "ok", key: "banner.statusUpdated", params: { status: target.target } });
      }
    } catch (err) {
      const msg = serverMessage(err);
      setBanner(msg ? { kind: "err", raw: msg } : { kind: "err", key: "errors.generic" });
    }
  };

  const handleMainAction = () => {
    if (!action) return;
    // Si l'action est "livrer", on ouvre la modale de confirmation (COD)
    if (action.target === "DELIVERED") {
      setShowDeliver(true);
    } else {
      doAdvance(action);
    }
  };

  const handleFail = async (reason: string) => {
    setBanner(null);
    try {
      await advance.mutateAsync({ status: "FAILED_DELIVERY", note: reason });
      setShowFail(false);
      setBanner({ kind: "err", key: "failure.recorded" });
    } catch (err) {
      const msg = serverMessage(err);
      setBanner(msg ? { kind: "err", raw: msg } : { kind: "err", key: "errors.generic" });
    }
  };

  const handleCall = async (outcome: CallOutcome) => {
    try {
      await call.mutateAsync({ outcome });
      setShowCallSheet(false);
      setBanner({ kind: "ok", key: "call.recorded" });
    } catch {
      setBanner({ kind: "err", key: "errors.callFailed" });
    }
  };

  /** Rend le bandeau : clé traduite (avec statut traduit en paramètre) ou message brut */
  const bannerText = (b: Banner): string => {
    if ("raw" in b) return b.raw;
    if (b.params?.status) {
      return t(b.key, { status: tc(`status.${b.params.status as LivreurJobStatus}`) });
    }
    return t(b.key);
  };

  return (
    <div className="liv-page">
      <Link to="/livreur/jobs" className="liv-back">
        <ArrowLeft size={16} /> {t("detail.back")}
      </Link>

      <div className="liv-detail-head">
        <span className="mono-cell liv-detail-trk">{job.trackingNumber}</span>
        <span className={`liv-badge liv-b-${job.status === "DELIVERED" ? "done" : job.status === "FAILED_DELIVERY" ? "fail" : "transit"}`}>
          {tc(`status.${job.status}`)}
        </span>
      </div>

      {banner && (
        <div className={`liv-banner ${banner.kind === "ok" ? "ok" : "err"}`}>
          {banner.kind === "ok" ? <Check size={16} /> : <X size={16} />}
          {bannerText(banner)}
        </div>
      )}

      {/* Carte destinataire avec actions rapides */}
      <div className="liv-card">
        <div className="liv-card-label">{t("detail.receiver")}</div>
        <div className="liv-receiver-name">{job.receiverName}</div>
        <div className="liv-addr-full">
          {/* Gouvernorats tunisiens : jamais traduits */}
          <MapPin size={15} /> {job.deliveryAddress}, {job.deliveryCity}
        </div>

        <div className="liv-contact-actions">
          <a href={`tel:${job.receiverPhone}`} className="liv-contact-btn call">
            <Phone size={16} /> {t("detail.call")}
          </a>
          <button className="liv-contact-btn log" onClick={() => setShowCallSheet(true)}>
            <PhoneCall size={16} /> {t("detail.logCall")}
          </button>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(job.deliveryAddress + ", " + job.deliveryCity)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="liv-contact-btn map"
          >
            <MapPin size={16} /> {t("detail.map")}
          </a>
        </div>
      </div>

      {/* COD en évidence */}
      {cod > 0 && (
        <div className="liv-cod-card">
          <Wallet size={22} />
          <div>
            <span className="liv-cod-card-label">{t("detail.codToCollect")}</span>
            <span className="liv-cod-card-amount">{cod.toFixed(0)} DT</span>
          </div>
        </div>
      )}

      {/* Détails colis */}
      <div className="liv-card">
        <div className="liv-card-label">{t("detail.package")}</div>
        <div className="liv-tags-row">
          <span className={`liv-tag ${job.deliveryType === "EXPRESS" ? "express" : "std"}`}>
            {job.deliveryType === "EXPRESS"
              ? <><Zap size={12} /> {t("tags.express")}</>
              : t("tags.standard")}
          </span>
          {job.isFragile && (
            <span className="liv-tag fragile"><AlertTriangle size={12} /> {t("tags.fragile")}</span>
          )}
        </div>
        {job.description && <p className="liv-desc">{job.description}</p>}
      </div>

      {/* Ramassage */}
      <div className="liv-card">
        <div className="liv-card-label">{t("detail.pickup")}</div>
        <div className="liv-addr-full">
          <Package size={15} /> {job.pickupAddress}, {job.pickupCity}
        </div>
        <div className="liv-sender">{t("detail.senderLine", { name: job.senderName })}</div>
      </div>

      {/* Historique (mini timeline) */}
      <div className="liv-card">
        <div className="liv-card-label">{t("detail.trackingTitle")}</div>
        <div className="liv-timeline">
          {job.statusHistory.map((h) => (
            <div className="liv-tl-item" key={h.id}>
              <div className="liv-tl-dot" />
              <div className="liv-tl-body">
                <span className="liv-tl-status">{tc(`status.${h.status}`)}</span>
                {h.note && <span className="liv-tl-note">{noteText(h.note)}</span>}
                <span className="liv-tl-time">
                  {new Date(h.createdAt).toLocaleString(locale, {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Barre d'action collée en bas */}
      {!isTerminal && (
        <div className="liv-action-bar">
          {action && (
            <button className="liv-btn-main" onClick={handleMainAction} disabled={advance.isPending}>
              {action.target === "DELIVERED" ? <Check size={18} /> : <Truck size={18} />}
              {advance.isPending ? "..." : t(action.labelKey)}
            </button>
          )}
          <button className="liv-btn-fail" onClick={() => setShowFail(true)} disabled={advance.isPending}>
            <AlertTriangle size={16} /> {t("actions.reportFailure")}
          </button>
        </div>
      )}

      {isTerminal && (
        <div className={`liv-terminal ${job.status === "DELIVERED" ? "ok" : "fail"}`}>
          {job.status === "DELIVERED" ? (
            <><Check size={18} /> {t("detail.terminalDelivered")}</>
          ) : (
            <><AlertTriangle size={18} /> {t("detail.terminalFailed")}</>
          )}
        </div>
      )}

      {/* Modales */}
      <FailureModal
        open={showFail}
        onClose={() => setShowFail(false)}
        onConfirm={handleFail}
        pending={advance.isPending}
      />
      <DeliveryConfirmModal
        open={showDeliver}
        codAmount={cod}
        receiverName={job.receiverName}
        onClose={() => setShowDeliver(false)}
        onConfirm={() => doAdvance(action, cod > 0 ? true : undefined)}
        pending={advance.isPending}
      />

      {/* Feuille "noter l'appel" */}
      {showCallSheet && (
        <div className="liv-overlay" onClick={(e) => e.target === e.currentTarget && setShowCallSheet(false)}>
          <div className="liv-sheet">
            <button className="liv-sheet-close" onClick={() => setShowCallSheet(false)}>
              <X size={18} />
            </button>
            <div className="liv-sheet-ic call"><PhoneCall size={26} /></div>
            <h3>{t("call.title")}</h3>
            <p className="liv-sheet-sub">{t("call.question", { name: job.receiverName })}</p>
            <div className="liv-call-options">
              <button className="liv-call-opt ok" onClick={() => handleCall("ANSWERED")} disabled={call.isPending}>
                {t("call.answered")}
              </button>
              <button className="liv-call-opt" onClick={() => handleCall("NO_ANSWER")} disabled={call.isPending}>
                {t("call.noAnswer")}
              </button>
              <button className="liv-call-opt" onClick={() => handleCall("RESCHEDULED")} disabled={call.isPending}>
                {t("call.rescheduled")}
              </button>
              <button className="liv-call-opt warn" onClick={() => handleCall("WRONG_NUMBER")} disabled={call.isPending}>
                {t("call.wrongNumber")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
