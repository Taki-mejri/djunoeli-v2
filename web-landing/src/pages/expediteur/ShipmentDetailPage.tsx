import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, X as XIcon, Check } from "lucide-react";
import { useMyShipment } from "../../lib/shipmentQueries";
import ShipmentDetailContent from "../../components/shipments/ShipmentDetailContent";
import CancelShipmentModal from "../../components/CancelShipmentModal";

/* Annulable par l'expéditeur : PENDING/ASSIGNED. Après ramassage, le bouton reste
   visible mais le modal explique qu'il faut passer par le support. */
const CANCEL_VISIBLE = ["PENDING", "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"];

export default function ShipmentDetailPageExpediteur() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("expediteur");
  const { t: tc } = useTranslation("common");
  const { data, isLoading, isError, error } = useMyShipment(id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelDone, setCancelDone] = useState<string | null>(null);

  if (isLoading) return <div className="api-loading">{tc("actions.loading")}</div>;

  if (isError) {
    return (
      <div className="api-err">
        <AlertCircle size={18} />
        {t("detail.loadError", { message: (error as Error)?.message ?? t("detail.notFound") })}
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
        backLink="/expediteur/shipments"
        topActions={
          CANCEL_VISIBLE.includes(data.status) && (
            <button
              className="liv-fail-btn"
              style={{ background: "#fde7e9", color: "#d23744", border: "1.5px solid #f5a4ab", padding: "10px 18px" }}
              onClick={() => setConfirmCancel(true)}
            >
              <XIcon size={16} /> {t("detail.cancelCta")}
            </button>
          )
        }
      />
      <CancelShipmentModal
        open={confirmCancel}
        target={{ id, trackingNumber: data.trackingNumber, status: data.status, deliveryPrice: Number(data.deliveryPrice) }}
        asAdmin={false}
        onClose={() => setConfirmCancel(false)}
        onDone={setCancelDone}
      />
    </>
  );
}
