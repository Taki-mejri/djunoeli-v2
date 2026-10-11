import { useState } from "react";
import { useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { AlertCircle, X as XIcon } from "lucide-react";
import { useAdminShipment, useCancelShipmentAdmin } from "../../lib/shipmentQueries";
import ShipmentDetailContent from "../../components/shipments/ShipmentDetailContent";

export default function ShipmentDetailPageAdmin() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useAdminShipment(id);
  const cancel = useCancelShipmentAdmin();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  if (isLoading) return <div className="api-loading">Chargement...</div>;

  if (isError) {
    return (
      <div className="api-err">
        <AlertCircle size={18} />
        Erreur : {(error as Error)?.message ?? "Colis introuvable"}
      </div>
    );
  }

  if (!data) return null;

  const cancellable = ["PENDING", "AWAITING_PICKUP"].includes(data.status);

  const onConfirmCancel = async () => {
    if (!id) return;
    setServerError(null);
    try {
      await cancel.mutateAsync({ id, reason: reason.trim() || undefined });
      setConfirmCancel(false);
      setReason("");
    } catch (err) {
      const msg = isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : null;
      setServerError(msg ?? "Erreur lors de l'annulation");
    }
  };

  return (
    <>
      <ShipmentDetailContent
        shipment={data}
        backLink="/admin/shipments"
        showExpediteur
        topActions={
          cancellable && (
            <button
              className="liv-fail-btn"
              style={{ background: "#fde7e9", color: "#d23744", border: "1.5px solid #f5a4ab", padding: "10px 18px" }}
              onClick={() => setConfirmCancel(true)}
            >
              <XIcon size={16} /> Annuler le colis
            </button>
          )
        }
      />

      {confirmCancel && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && !cancel.isPending && setConfirmCancel(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <h3 style={{ textAlign: "center" }}>Annuler ce colis ?</h3>
            <p className="m-sub" style={{ textAlign: "center" }}>
              Le colis <b>{data.trackingNumber}</b> sera marqué comme annulé.
            </p>
            {serverError && <div className="auth-server-err" style={{ marginTop: 12 }}>{serverError}</div>}
            <div className="set-field" style={{ marginTop: 16 }}>
              <label>Raison (optionnelle)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="tbl-btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmCancel(false)} disabled={cancel.isPending}>
                Garder
              </button>
              <button
                className="liv-fail-btn"
                style={{ flex: 1.4, background: "#fde7e9", color: "#d23744", border: "1.5px solid #f5a4ab" }}
                onClick={onConfirmCancel}
                disabled={cancel.isPending}
              >
                {cancel.isPending ? "Annulation..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
