import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TruckElectric, Star, Check } from "lucide-react";
import ScanStation from "../../components/dispatch/ScanStation";
import { axiosMessage, type ScanFeedback } from "../../lib/scanFeedback";
import { useScanAssign, useAssignableLivreurs } from "../../lib/dispatcherQueries";
import { dateLocaleTag } from "../../lib/dateLocale";

type RecentAssign = {
  trackingNumber: string;
  livreurName: string;
  at: string;
};

function initials(first: string | null, last: string | null): string {
  return [(first ?? "").charAt(0), (last ?? "").charAt(0)].join("").toUpperCase() || "?";
}

export default function AssignPage() {
  const { t, i18n } = useTranslation("dispatch");
  const { t: tc } = useTranslation("common");
  const locale = dateLocaleTag(i18n.language);
  const { data: livreurs, isLoading } = useAssignableLivreurs();
  const scan = useScanAssign();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentAssign[]>([]);

  const selected = livreurs?.find((l) => l.id === selectedId) ?? null;

  const handleScan = async (tracking: string): Promise<ScanFeedback> => {
    if (!selectedId) {
      return {
        kind: "error",
        title: { key: "assignment.noLivreur" },
        detail: { key: "assignment.noLivreurDetail" },
      };
    }
    try {
      const result = await scan.mutateAsync({ trackingNumber: tracking, livreurId: selectedId });
      const s = result.shipment;

      setRecent((prev) => [
        {
          trackingNumber: s.trackingNumber,
          livreurName: result.livreurName,
          at: new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev,
      ].slice(0, 20));

      return {
        kind: "success",
        title: {
          key: "assignment.success",
          params: { tracking: s.trackingNumber, name: result.livreurName },
        },
        detail: { key: "assignment.nextStep" },
      };
    } catch (err) {
      const msg = axiosMessage(err);
      return {
        kind: "error",
        title: { key: "scan.failed" },
        detail: msg ? { raw: msg } : { key: "scan.error" },
        trackingNumber: tracking,
      };
    }
  };

  return (
    <ScanStation
      title={t("assignment.title")}
      subtitle={t("assignment.subtitle")}
      onScan={handleScan}
      disabled={!selectedId}
      disabledHint={t("assignment.livreurDisabled")}
      recentList={
        recent.length > 0 && (
          <>
            <p className="dsp-recent-title">{t("assignment.sessionTitle", { count: recent.length })}</p>
            <div className="dsp-recent-list">
              {recent.map((r, i) => (
                <div className="dsp-recent-row" key={`${r.trackingNumber}-${i}`}>
                  <TruckElectric size={16} />
                  <span className="mono-cell dsp-recent-trk">{r.trackingNumber}</span>
                  <span className="dsp-recent-info">→ {r.livreurName}</span>
                  <span className="dsp-recent-badge assign">{t("assignment.handed")}</span>
                  <span className="dsp-recent-time">{r.at}</span>
                </div>
              ))}
            </div>
          </>
        )
      }
    >
      <div className="dsp-selector">
        <label>{t("assignment.livreurLabel")}</label>
        {isLoading ? (
          <div className="api-loading">{t("assignment.loadingLivreurs")}</div>
        ) : (
          <div className="dsp-livreur-grid">
            {livreurs?.map((l) => {
              const isOffline = l.status === "OFFLINE";
              const isSel = l.id === selectedId;
              return (
                <button
                  key={l.id}
                  type="button"
                  className={`dsp-livreur-card ${isSel ? "selected" : ""} ${isOffline ? "offline" : ""}`}
                  onClick={() => !isOffline && setSelectedId(isSel ? null : l.id)}
                  disabled={isOffline}
                >
                  <div className="dsp-liv-avatar">{initials(l.firstName, l.lastName)}</div>
                  <div className="dsp-liv-body">
                    <span className="dsp-liv-name">
                      {[l.firstName, l.lastName].filter(Boolean).join(" ") || t("assignment.livreurFallback")}
                    </span>
                    <span className="dsp-liv-meta">
                      {t(`vehicles.${l.vehicleType}`, { defaultValue: l.vehicleType })} ·{" "}
                      {t("assignment.jobsCount", { count: l.activeCount })} ·{" "}
                      <span className={`dsp-liv-status ${l.status.toLowerCase()}`}>
                        {tc(`livreurStatus.${l.status}`)}
                      </span>
                    </span>
                  </div>
                  {l.rating != null && (
                    <span className="dsp-liv-rating">
                      <Star size={13} /> {Number(l.rating).toFixed(1)}
                    </span>
                  )}
                  {isSel && <span className="dsp-liv-check"><Check size={16} /></span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="dsp-active-bin assign">
          <TruckElectric size={16} />
          {t("assignment.activeLivreur", {
            name: [selected.firstName, selected.lastName].filter(Boolean).join(" "),
          })}
          {selected.phone ? <> · {selected.phone}</> : null} — {t("assignment.activeLivreurHint")}
        </div>
      )}
    </ScanStation>
  );
}
