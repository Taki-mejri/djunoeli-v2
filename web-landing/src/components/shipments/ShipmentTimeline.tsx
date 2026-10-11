import { useTranslation } from "react-i18next";
import { Check, Clock, Truck, Package, X, AlertCircle, Home } from "lucide-react";
import {
  type ShipmentStatus,
  type ShipmentStatusHistoryEntry,
} from "../../lib/shipmentQueries";
import { dateLocaleTag } from "../../lib/dateLocale";
import { serverNoteKey } from "../../lib/serverNotes";

const statusIcon: Record<ShipmentStatus, React.ReactNode> = {
  PENDING: <Clock size={14} />,
  AWAITING_PICKUP: <Home size={14} />,
  PICKED_UP: <Package size={14} />,
  AT_WAREHOUSE: <Home size={14} />,
  IN_TRANSIT: <Truck size={14} />,
  OUT_FOR_DELIVERY: <Truck size={14} />,
  DELIVERED: <Check size={14} />,
  FAILED_DELIVERY: <AlertCircle size={14} />,
  RETURNED: <AlertCircle size={14} />,
  CANCELLED: <X size={14} />,
};

const statusColor: Record<ShipmentStatus, string> = {
  PENDING: "#8a99a8",
  AWAITING_PICKUP: "#b76e09",
  PICKED_UP: "#2563c9",
  AT_WAREHOUSE: "#2563c9",
  IN_TRANSIT: "#b76e09",
  OUT_FOR_DELIVERY: "#0b7a63",
  DELIVERED: "#1f9d55",
  FAILED_DELIVERY: "#d23744",
  RETURNED: "#d23744",
  CANCELLED: "#d23744",
};

type Props = {
  history: ShipmentStatusHistoryEntry[];
};

export default function ShipmentTimeline({ history }: Props) {
  const { t, i18n } = useTranslation("expediteur");
  const { t: tc } = useTranslation("common");
  const locale = dateLocaleTag(i18n.language);

  /** Traduit une note système connue, sinon renvoie le texte brut du backend */
  const noteText = (note: string) => {
    const key = serverNoteKey(note);
    return key ? tc(key) : note;
  };

  if (history.length === 0) {
    return <div className="cell-sub">{t("timeline.log.empty")}</div>;
  }

  // History est déjà triée DESC (plus récent en premier) par le backend
  return (
    <div className="ship-timeline">
      {history.map((entry, i) => (
        <div className="ship-tl-item" key={entry.id}>
          <div className="ship-tl-marker" style={{ background: statusColor[entry.status] }}>
            {statusIcon[entry.status]}
          </div>
          {i < history.length - 1 && <div className="ship-tl-line" />}
          <div className="ship-tl-content">
            <div className="ship-tl-head">
              <b style={{ color: statusColor[entry.status] }}>{tc(`status.${entry.status}`)}</b>
              <span className="ship-tl-date">
                {new Date(entry.createdAt).toLocaleString(locale, {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {entry.note && <p className="ship-tl-note">{noteText(entry.note)}</p>}
            {entry.changedBy && (
              <span className="ship-tl-by">
                {t("timeline.log.by", {
                  name:
                    [entry.changedBy.firstName, entry.changedBy.lastName].filter(Boolean).join(" ") ||
                    entry.changedBy.email,
                })}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
