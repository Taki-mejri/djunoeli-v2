import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { X, Ban, RotateCcw, AlertTriangle } from "lucide-react";
import { useCancelShipment } from "../lib/cancelQueries";
import { formatEUR } from "../lib/money";

type CancelTarget = {
  id: string;
  trackingNumber: string;
  status: string;
  deliveryPrice: number | null;
};

type Props = {
  open: boolean;
  target: CancelTarget | null;
  asAdmin?: boolean;
  onClose: () => void;
  onDone: (msg: string) => void;
};

const PICKED_STATES = ["PICKED_UP", "OUT_FOR_DELIVERY"];

/* Même règle que le backend (affichage de l'aperçu) */
function refundTier(status: string): number {
  if (status === "PENDING" || status === "ASSIGNED") return 1;
  if (status === "PICKED_UP" || status === "OUT_FOR_DELIVERY") return 0.5;
  return 0;
}

export default function CancelShipmentModal({ open, target, asAdmin = false, onClose, onDone }: Props) {
  const { t } = useTranslation("common");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cancel = useCancelShipment(asAdmin);

  if (!open || !target) return null;

  const tier = refundTier(target.status);
  const price = target.deliveryPrice ?? 0;
  // en centimes, comme le backend (8,35 € × 50 % = 4,18 €)
  const refund = Math.round(Math.round(price * 100) * tier) / 100;
  const tierPercent = Math.round(tier * 100);
  const expediteurBlocked = !asAdmin && PICKED_STATES.includes(target.status);

  const submit = async () => {
    setError(null);
    try {
      const res = await cancel.mutateAsync({ shipmentId: target.id, reason: reason.trim() || undefined });
      // Message traduit (le message serveur est en français)
      onDone(
        res.refundAmount > 0
          ? t("cancel.doneRefund", { tracking: res.trackingNumber, amount: formatEUR(res.refundAmount), percent: res.tierPercent })
          : t("cancel.done")
      );
      setReason("");
      onClose();
    } catch (err) {
      const msg = isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : null;
      setError(msg ?? t("common.error"));
    }
  };

  return (
    <div className="cx-overlay" onClick={(e) => e.target === e.currentTarget && !cancel.isPending && onClose()}>
      <div className="cx-modal">
        <button className="cx-close" onClick={onClose} disabled={cancel.isPending}><X size={18} /></button>

        <div className="cx-ic"><Ban size={24} /></div>
        <h3>{t("cancel.title")}</h3>
        <p className="cx-sub">{target.trackingNumber}</p>

        {expediteurBlocked ? (
          <div className="cx-blocked">
            <AlertTriangle size={16} /> {t("cancel.blockedPicked")}
          </div>
        ) : (
          <>
            <div className="cx-refund">
              <div className="cx-refund-row">
                <span>{t("cancel.price")}</span>
                <b>{formatEUR(price)}</b>
              </div>
              <div className="cx-refund-row big">
                <span><RotateCcw size={14} /> {t("cancel.refund")} ({tierPercent}%)</span>
                <b className={refund > 0 ? "pos" : ""}>{formatEUR(refund)}</b>
              </div>
              <p className="cx-tier-note">
                {tier === 1 ? t("cancel.tierFull") : tier === 0.5 ? t("cancel.tierHalf") : t("cancel.tierNone")}
              </p>
            </div>

            <div className="cx-field">
              <label>{t("cancel.reason")} <span className="cx-opt">({t("common.optional")})</span></label>
              <input
                type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                maxLength={300} placeholder={t("cancel.reasonPlaceholder")}
              />
            </div>
          </>
        )}

        {error && <div className="cx-error">{error}</div>}

        <div className="cx-actions">
          <button className="cx-btn-ghost" onClick={onClose} disabled={cancel.isPending}>
            {t("cancel.keep")}
          </button>
          {!expediteurBlocked && (
            <button className="cx-btn-danger" onClick={submit} disabled={cancel.isPending}>
              {cancel.isPending ? t("actions.loading") : t("cancel.confirm")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
