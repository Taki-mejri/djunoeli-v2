import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, AlertTriangle } from "lucide-react";
import { isAxiosError } from "axios";
import { useCancelMyShipment } from "../../lib/shipmentQueries";

type Props = {
  open: boolean;
  shipmentId: string | null;
  trackingNumber: string | null;
  onClose: () => void;
};

/** Clé i18n (re-traduite au changement de langue) ou message brut du backend */
type ServerError = { key: string } | { raw: string };

export default function CancelShipmentModal({ open, shipmentId, trackingNumber, onClose }: Props) {
  const { t } = useTranslation("expediteur");
  const cancel = useCancelMyShipment();
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<ServerError | null>(null);

  if (!open || !shipmentId) return null;

  const submit = async () => {
    setServerError(null);
    try {
      await cancel.mutateAsync({ id: shipmentId, reason: reason.trim() || undefined });
      setReason("");
      onClose();
    } catch (err) {
      if (isAxiosError(err)) {
        const msg = (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
        setServerError(msg ? { raw: msg } : { key: "cancel.errors.cancel" });
      } else {
        setServerError({ key: "cancel.errors.network" });
      }
    }
  };

  return (
    <div
      className="overlay"
      onClick={(e) => e.target === e.currentTarget && !cancel.isPending && onClose()}
    >
      <div className="modal" style={{ maxWidth: 480 }}>
        <button className="modal-close" onClick={onClose} disabled={cancel.isPending}>
          <X size={18} />
        </button>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div className="liv-modal-ic ko"><AlertTriangle size={28} /></div>
        </div>

        <h3 style={{ textAlign: "center" }}>{t("cancel.title")}</h3>
        <p className="m-sub" style={{ textAlign: "center" }}>
          {t("cancel.descPrefix")} <b>{trackingNumber}</b> {t("cancel.descSuffix")}
        </p>

        {serverError && (
          <div className="auth-server-err" style={{ marginTop: 12 }}>
            {"key" in serverError ? t(serverError.key) : serverError.raw}
          </div>
        )}

        <div className="set-field" style={{ marginTop: 16 }}>
          <label>{t("cancel.reasonLabel")}</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("cancel.reasonPlaceholder")}
            maxLength={200}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            className="tbl-btn-ghost"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={cancel.isPending}
          >
            {t("cancel.keep")}
          </button>
          <button
            type="button"
            className="liv-fail-btn"
            style={{ flex: 1.4, background: "#fde7e9", color: "#d23744", border: "1.5px solid #f5a4ab" }}
            onClick={submit}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? t("cancel.pending") : t("cancel.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
