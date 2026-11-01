import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Ban, Check } from "lucide-react";
import { useAdminShipment } from "../../lib/shipmentQueries";
import ShipmentDetailContent from "../../components/shipments/ShipmentDetailContent";
import CancelShipmentModal from "../../components/CancelShipmentModal";

/* Annulable par l'admin : avant ramassage (100 %) et après ramassage (50 %) */
const CANCELLABLE = ["PENDING", "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"];

export default function ShipmentDetailPageAdmin() {
  const { id } = useParams<{ id: string }>();
  const { t: tc } = useTranslation("common");
  const { data, isLoading, isError, error } = useAdminShipment(id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelDone, setCancelDone] = useState<string | null>(null);

  if (isLoading) return <div className="api-loading">{tc("actions.loading")}</div>;

  if (isError) {
    return (
      <div className="api-err">
        <AlertCircle size={18} />
        {(error as Error)?.message ?? tc("common.error")}
      </div>
    );
  }

  if (!data || !id) return null;

  return (
    <>
      {cancelDone && (
        <div className="asg-banner ok"><Check size={16} /> {cancelDone}</div>
      )}
      <ShipmentDetailContent
        shipment={data}
        backLink="/admin/shipments"
        showExpediteur
        topActions={
          CANCELLABLE.includes(data.status) && (
            <button
              className="liv-fail-btn"
              style={{ background: "#fde7e9", color: "#d23744", border: "1.5px solid #f5a4ab", padding: "10px 18px" }}
              onClick={() => setConfirmCancel(true)}
            >
              <Ban size={16} /> {tc("cancel.confirm")}
            </button>
          )
        }
      />

      <CancelShipmentModal
        open={confirmCancel}
        target={{ id, trackingNumber: data.trackingNumber, status: data.status, deliveryPrice: Number(data.deliveryPrice) }}
        asAdmin
        onClose={() => setConfirmCancel(false)}
        onDone={setCancelDone}
      />
    </>
  );
}
