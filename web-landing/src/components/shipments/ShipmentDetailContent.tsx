import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, AlertTriangle, MapPin, User, Truck, Wallet, Package,
  Phone, Calendar,
} from "lucide-react";
import StatusBadge from "../dashboard/StatusBadge";
import ShipmentTimeline from "./ShipmentTimeline";
import ShipmentProgressTimeline from "./ShipmentProgressTimeline";
import {
  shipmentStatusTone,
  type ShipmentWithHistory,
} from "../../lib/shipmentQueries";
import { dateLocaleTag } from "../../lib/dateLocale";
import { formatEUR } from "../../lib/money";

type Props = {
  shipment: ShipmentWithHistory;
  backLink: string;
  topActions?: React.ReactNode;
  showExpediteur?: boolean;
};

export default function ShipmentDetailContent({ shipment, backLink, topActions, showExpediteur }: Props) {
  const s = shipment;
  const { t, i18n } = useTranslation("expediteur");
  const { t: tc } = useTranslation("common");
  const locale = dateLocaleTag(i18n.language);

  return (
    <>
      <div className="ds-page-head">
        <div>
          <Link to={backLink} className="auth-back" style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> {tc("actions.back")}
          </Link>
          <h1>
            <span className="mono-cell" style={{ fontSize: 22 }}>{s.trackingNumber}</span>
          </h1>
          <p>
            <StatusBadge label={tc(`status.${s.status}`)} tone={shipmentStatusTone[s.status]} />
            {s.statusReason && <span style={{ marginLeft: 10, color: "var(--muted)", fontSize: 13 }}>· {s.statusReason}</span>}
          </p>
        </div>
        {topActions && <div>{topActions}</div>}
      </div>

      {/* ===== NOUVELLE TIMELINE VISUELLE EN HAUT ===== */}
      <div className="ship-section" style={{ marginBottom: 18 }}>
        <ShipmentProgressTimeline
          currentStatus={s.status}
          history={s.statusHistory}
        />
      </div>

      <div className="ship-detail-grid">
        {/* Colonne gauche — détails */}
        <div className="ship-detail-col">
          {/* Type + Prix */}
          <div className="ship-section">
            <div className="ship-section-head">
              <span className="ship-section-ic"><Truck size={17} /></span>
              <h3>{t("detail.sections.delivery")}</h3>
            </div>
            <div className="ship-detail-grid-2">
              <div className="sd-cell">
                <span className="sd-label">{t("detail.type")}</span>
                <b>{s.deliveryType === "EXPRESS" ? `⚡ ${t("shipmentType.express")}` : t("shipmentType.standard")}</b>
              </div>
              <div className="sd-cell">
                <span className="sd-label">{t("detail.pricePaid")}</span>
                <b>{formatEUR(s.deliveryPrice)}</b>
              </div>
              {s.isFragile && (
                <div className="sd-cell" style={{ gridColumn: "span 2" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#d23744", fontWeight: 700, fontSize: 13 }}>
                    <AlertTriangle size={13} /> {t("detail.fragileNote")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Expéditeur — admin only */}
          {showExpediteur && (
            <div className="ship-section">
              <div className="ship-section-head">
                <span className="ship-section-ic"><User size={17} /></span>
                <h3>{t("detail.sections.expediteur")}</h3>
              </div>
              <div className="ship-detail-grid-2">
                <div className="sd-cell">
                  <span className="sd-label">{t("detail.company")}</span>
                  <b>{s.expediteur.companyName}</b>
                </div>
                <div className="sd-cell">
                  <span className="sd-label">{t("detail.contact")}</span>
                  <b>{s.expediteur.user.email}</b>
                </div>
              </div>
            </div>
          )}

          {/* Ramassage */}
          <div className="ship-section">
            <div className="ship-section-head">
              <span className="ship-section-ic"><MapPin size={17} /></span>
              <h3>{t("detail.sections.pickup")}</h3>
            </div>
            <p className="sd-addr">{s.pickupAddress}</p>
            <p className="sd-city">{s.pickupCity}</p>
          </div>

          {/* Destinataire */}
          <div className="ship-section">
            <div className="ship-section-head">
              <span className="ship-section-ic"><User size={17} /></span>
              <h3>{t("detail.sections.receiver")}</h3>
            </div>
            <p className="sd-addr"><b>{s.receiverName}</b></p>
            <p className="sd-city" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Phone size={13} /> {s.receiverPhone}
            </p>
            {s.receiverEmail && (
              <p className="sd-city">{s.receiverEmail}</p>
            )}
            <p className="sd-addr" style={{ marginTop: 8 }}>{s.deliveryAddress}</p>
            <p className="sd-city">{s.deliveryCity}</p>
          </div>

          {/* Colis */}
          <div className="ship-section">
            <div className="ship-section-head">
              <span className="ship-section-ic"><Package size={17} /></span>
              <h3>{t("detail.sections.content")}</h3>
            </div>
            <p style={{ fontSize: 14, color: "var(--navy)" }}>
              {s.description || <em style={{ color: "var(--muted)" }}>{t("detail.noDescription")}</em>}
            </p>
          </div>

          {/* COD */}
          {Number(s.codAmount) > 0 && (
            <div className="ship-section ship-cod-card">
              <div className="ship-section-head">
                <span className="ship-section-ic"><Wallet size={17} /></span>
                <h3>{t("detail.sections.cod")}</h3>
              </div>
              <div className="sd-cod-big">
                {formatEUR(s.codAmount)}
              </div>
              <p className="sd-cod-note">{t("detail.codNote")}</p>
            </div>
          )}

          {/* Livreur */}
          {s.livreur && (
            <div className="ship-section">
              <div className="ship-section-head">
                <span className="ship-section-ic"><Truck size={17} /></span>
                <h3>{t("detail.sections.livreur")}</h3>
              </div>
              <p className="sd-addr">
                <b>{[s.livreur.user.firstName, s.livreur.user.lastName].filter(Boolean).join(" ")}</b>
              </p>
              {s.livreur.user.phone && (
                <p className="sd-city" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Phone size={13} /> {s.livreur.user.phone}
                </p>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="ship-section">
            <div className="ship-section-head">
              <span className="ship-section-ic"><Calendar size={17} /></span>
              <h3>{t("detail.sections.dates")}</h3>
            </div>
            <div className="ship-detail-grid-2">
              <div className="sd-cell">
                <span className="sd-label">{t("detail.createdAt")}</span>
                <b>{new Date(s.createdAt).toLocaleString(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</b>
              </div>
              {s.pickedUpAt && (
                <div className="sd-cell">
                  <span className="sd-label">{t("detail.pickedUpAt")}</span>
                  <b>{new Date(s.pickedUpAt).toLocaleString(locale)}</b>
                </div>
              )}
              {s.deliveredAt && (
                <div className="sd-cell">
                  <span className="sd-label">{t("detail.deliveredAt")}</span>
                  <b>{new Date(s.deliveredAt).toLocaleString(locale)}</b>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite — Journal détaillé (l'ancienne timeline reste, utile en sidebar) */}
        <aside className="ship-detail-timeline">
          <div className="ship-section">
            <div className="ship-section-head">
              <span className="ship-section-ic"><Calendar size={17} /></span>
              <h3>{t("detail.sections.journal")}</h3>
            </div>
            <ShipmentTimeline history={s.statusHistory} />
          </div>
        </aside>
      </div>
    </>
  );
}
