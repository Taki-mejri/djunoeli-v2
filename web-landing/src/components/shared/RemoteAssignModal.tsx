import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import {
  X, Search, Package, Truck, Phone, AlertTriangle, Wallet,
  Check, PhoneCall, MapPin, ArrowRight, ArrowLeft,
} from "lucide-react";
import {
  useAssignableShipments, useAssignableLivreurs, useRemoteAssign,
  type AssignableShipment, type AssignableLivreur,
} from "../../lib/remoteAssignQueries";
import { formatEUR } from "../../lib/money";

/** Résultat remonté à la page : clé i18n ou message brut du backend */
export type RemoteAssignResult = { key: string } | { raw: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Colis pré-sélectionné (si ouvert depuis une ligne de liste) */
  presetShipment?: AssignableShipment | null;
  onDone?: (result: RemoteAssignResult) => void;
};

export default function RemoteAssignModal({ open, onClose, presetShipment, onDone }: Props) {
  const { t } = useTranslation("dispatch");
  const { t: tc } = useTranslation("common");
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(presetShipment ? 2 : 1);
  const [selShipment, setSelShipment] = useState<AssignableShipment | null>(presetShipment ?? null);
  const [selLivreur, setSelLivreur] = useState<AssignableLivreur | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  // Erreur : clé i18n ou message brut, jamais de texte figé
  const [error, setError] = useState<RemoteAssignResult | null>(null);

  const { data: shipments, isLoading: loadingShip } = useAssignableShipments(search);
  const { data: livreurs, isLoading: loadingLiv } = useAssignableLivreurs();
  const assign = useRemoteAssign();

  const livreurName = (l: AssignableLivreur | null) =>
    l ? [l.firstName, l.lastName].filter(Boolean).join(" ") || t("assignment.livreurFallback") : "";

  const reset = () => {
    setSearch(""); setStep(1); setSelShipment(null); setSelLivreur(null);
    setConfirmed(false); setReason(""); setError(null);
  };

  const close = () => { reset(); onClose(); };

  const canSubmit = selShipment && selLivreur && confirmed && reason.trim().length >= 3;

  const submit = async () => {
    if (!canSubmit || !selShipment || !selLivreur) return;
    setError(null);
    try {
      await assign.mutateAsync({
        shipmentId: selShipment.id,
        livreurId: selLivreur.id,
        confirmed: true,
        reason: reason.trim(),
      });
      onDone?.({ key: "remoteAssign.success" });
      close();
    } catch (err) {
      const msg = isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : null;
      setError(msg ? { raw: msg } : { key: "remoteAssign.error" });
    }
  };

  const sortedLivreurs = useMemo(() => {
    if (!livreurs) return [];
    const order: Record<string, number> = { AVAILABLE: 0, BUSY: 1, OFFLINE: 2 };
    return [...livreurs].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [livreurs]);

  if (!open) return null;

  return (
    <div className="ra-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="ra-modal">
        <div className="ra-head">
          <div>
            <h2><PhoneCall size={18} /> {t("remoteAssign.modalTitle")}</h2>
            <p>{t("remoteAssign.modalSubtitle")}</p>
          </div>
          <button className="ra-close" onClick={close} aria-label={tc("actions.close")}><X size={18} /></button>
        </div>

        {/* Stepper */}
        <div className="ra-steps">
          <span className={`ra-step ${step >= 1 ? "on" : ""} ${selShipment ? "done" : ""}`}>1 · {t("remoteAssign.stepShipment")}</span>
          <span className="ra-step-line" />
          <span className={`ra-step ${step >= 2 ? "on" : ""} ${selLivreur ? "done" : ""}`}>2 · {t("remoteAssign.stepLivreur")}</span>
          <span className="ra-step-line" />
          <span className={`ra-step ${step >= 3 ? "on" : ""}`}>3 · {t("remoteAssign.stepConfirm")}</span>
        </div>

        <div className="ra-body">
          {/* ===== ÉTAPE 1 — CHOISIR LE COLIS ===== */}
          {step === 1 && (
            <>
              <div className="ra-search">
                <Search size={17} />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("remoteAssign.searchPlaceholder")}
                />
              </div>
              <div className="ra-list">
                {loadingShip ? (
                  <div className="api-loading">{tc("actions.loading")}</div>
                ) : shipments && shipments.length === 0 ? (
                  <p className="ra-empty">{t("remoteAssign.noShipment")}</p>
                ) : (
                  shipments?.map((s) => (
                    <button key={s.id} className="ra-ship" onClick={() => { setSelShipment(s); setStep(2); }}>
                      <div className="ra-ship-main">
                        <span className="mono-cell ra-ship-trk">{s.trackingNumber}</span>
                        <span className="ra-ship-badge">{tc(`status.${s.status}`, { defaultValue: s.status })}</span>
                      </div>
                      <div className="ra-ship-sub">
                        {/* Quartiers : non traduits */}
                        <MapPin size={12} /> {s.receiverName} · {s.deliveryCity}
                        {s.codAmount > 0 && <span className="ra-cod"><Wallet size={11} /> {formatEUR(s.codAmount)}</span>}
                        {s.isFragile && <span className="ra-frag"><AlertTriangle size={11} /> {t("tags.fragile")}</span>}
                      </div>
                      {s.currentLivreur && (
                        <span className="ra-ship-warn">
                          {t("remoteAssign.alreadyAssigned", { name: s.currentLivreur })}
                        </span>
                      )}
                      <ArrowRight size={16} className="ra-ship-arrow" />
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {/* ===== ÉTAPE 2 — CHOISIR LE LIVREUR ===== */}
          {step === 2 && (
            <>
              <div className="ra-selected">
                <Package size={15} />
                <span className="mono-cell">{selShipment?.trackingNumber}</span>
                <span>· {selShipment?.receiverName} · {selShipment?.deliveryCity}</span>
                <button className="ra-change" onClick={() => setStep(1)}>{t("remoteAssign.change")}</button>
              </div>
              <div className="ra-list">
                {loadingLiv ? (
                  <div className="api-loading">{tc("actions.loading")}</div>
                ) : (
                  sortedLivreurs.map((l) => (
                    <button
                      key={l.id}
                      className={`ra-liv ${selLivreur?.id === l.id ? "sel" : ""}`}
                      onClick={() => { setSelLivreur(l); setStep(3); }}
                    >
                      <div className="ra-liv-av"><Truck size={16} /></div>
                      <div className="ra-liv-info">
                        <b>{livreurName(l)}</b>
                        <span>
                          {t(`vehicles.${l.vehicleType}`, { defaultValue: l.vehicleType })}
                          {l.phone ? ` · ${l.phone}` : ""}
                        </span>
                      </div>
                      <span className={`ra-liv-status ${l.status.toLowerCase()}`}>
                        {tc(`livreurStatus.${l.status}`, { defaultValue: l.status })}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <button className="ra-back" onClick={() => setStep(1)}>
                <ArrowLeft size={15} /> {t("remoteAssign.backToShipment")}
              </button>
            </>
          )}

          {/* ===== ÉTAPE 3 — CONFIRMER ===== */}
          {step === 3 && (
            <>
              <div className="ra-recap">
                <div className="ra-recap-row">
                  <Package size={15} />
                  <div>
                    <span className="ra-recap-label">{t("remoteAssign.stepShipment")}</span>
                    <b className="mono-cell">{selShipment?.trackingNumber}</b>
                    <span className="ra-recap-sub">{selShipment?.receiverName} · {selShipment?.deliveryCity}</span>
                  </div>
                </div>
                <ArrowRight size={18} className="ra-recap-arrow" />
                <div className="ra-recap-row">
                  <Truck size={15} />
                  <div>
                    <span className="ra-recap-label">{t("remoteAssign.stepLivreur")}</span>
                    <b>{livreurName(selLivreur)}</b>
                    {selLivreur?.phone && (
                      <a href={`tel:${selLivreur.phone}`} className="ra-recap-phone">
                        <Phone size={12} /> {selLivreur.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="ra-field">
                <label>{t("remoteAssign.reasonLabel")}</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("remoteAssign.reasonPlaceholder")}
                  rows={2}
                  maxLength={300}
                />
              </div>

              <label className="ra-confirm">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>
                  <b>{t("remoteAssign.confirmCheck")}</b>
                  <small>{t("remoteAssign.confirmHint")}</small>
                </span>
              </label>

              {error && <div className="ra-error">{"raw" in error ? error.raw : t(error.key)}</div>}

              <div className="ra-actions">
                <button className="ra-btn-back" onClick={() => setStep(2)} disabled={assign.isPending}>
                  <ArrowLeft size={15} /> {t("remoteAssign.stepLivreur")}
                </button>
                <button className="ra-btn-confirm" onClick={submit} disabled={!canSubmit || assign.isPending}>
                  {assign.isPending
                    ? t("remoteAssign.assigning")
                    : <><Check size={16} /> {t("remoteAssign.assignTo", { name: livreurName(selLivreur) })}</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
