import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import {
  PackageSearch, Zap, AlertTriangle, Check, AlertCircle, Store, MapPin,
  UserCheck, CalendarClock, Sun, Sunrise, Ban,
} from "lucide-react";
import {
  useAssignableShipments, useLivreurs, useAssignShipment,
  type AssignableShipment,
} from "../../lib/dispatchQueries";
import { formatEUR } from "../../lib/money";
import CancelShipmentModal from "../../components/CancelShipmentModal";

type Tab = "PENDING" | "ASSIGNED";

export default function AssignPage() {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const { data: shipments, isLoading, isError } = useAssignableShipments();
  const { data: livreurs } = useLivreurs();
  const assign = useAssignShipment();

  const [tab, setTab] = useState<Tab>("PENDING");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AssignableShipment | null>(null);

  const pendingCount = shipments?.filter((s) => s.status === "PENDING").length ?? 0;
  const assignedCount = shipments?.filter((s) => s.status === "ASSIGNED").length ?? 0;
  const rows = shipments?.filter((s) => s.status === tab) ?? [];

  const doAssign = async (s: AssignableShipment) => {
    const livreurId = picked[s.id] ?? s.livreur?.id ?? "";
    if (!livreurId) return;
    setBusyId(s.id);
    setBanner(null);
    try {
      await assign.mutateAsync({ shipmentId: s.id, livreurId });
      // Message traduit (le message serveur est en français, il ne suivrait pas DE/EN)
      setBanner({ kind: "ok", msg: `${s.trackingNumber} — ${t("assign.done")}` });
      setPicked((p) => { const n = { ...p }; delete n[s.id]; return n; });
      setTimeout(() => setBanner(null), 5000);
    } catch (err) {
      const msg = isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : null;
      setBanner({ kind: "err", msg: msg ?? tc("common.error") });
    } finally {
      setBusyId(null);
    }
  };

  const roundBadge = (round: string | null) => {
    if (round === "express") return <span className="asg-round express"><Zap size={11} /> Express</span>;
    if (round === "today") return <span className="asg-round today"><Sun size={11} /> {t("assign.roundToday")}</span>;
    if (round === "tomorrow") return <span className="asg-round tomorrow"><Sunrise size={11} /> {t("assign.roundTomorrow")}</span>;
    return null;
  };

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("assign.title")}</h1>
          <p>{t("assign.subtitle")}</p>
        </div>
      </div>

      {banner && (
        <div className={`asg-banner ${banner.kind}`}>
          {banner.kind === "ok" ? <Check size={16} /> : <AlertCircle size={16} />} {banner.msg}
        </div>
      )}

      <div className="asg-tabs">
        <button className={tab === "PENDING" ? "active" : ""} onClick={() => setTab("PENDING")}>
          {t("assign.tabPending")} <span className="asg-tab-count">{pendingCount}</span>
        </button>
        <button className={tab === "ASSIGNED" ? "active" : ""} onClick={() => setTab("ASSIGNED")}>
          {t("assign.tabAssigned")} <span className="asg-tab-count">{assignedCount}</span>
        </button>
      </div>

      {isError && <div className="api-err"><AlertCircle size={18} /> {t("assign.loadError")}</div>}

      {isLoading ? (
        <div className="api-loading">...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <PackageSearch size={44} strokeWidth={1.4} />
          <h3>{tab === "PENDING" ? t("assign.emptyPending") : t("assign.emptyAssigned")}</h3>
        </div>
      ) : (
        <div className="asg-rows">
          {rows.map((s) => {
            const isExpress = s.deliveryType === "EXPRESS";
            const selected = picked[s.id] ?? s.livreur?.id ?? "";
            const changed = tab === "ASSIGNED" && selected !== (s.livreur?.id ?? "");
            return (
              <div className={`asg-row ${isExpress ? "express" : ""}`} key={s.id}>
                <div className="asg-main">
                  <div className="asg-trk-line">
                    <span className="mono-cell">{s.trackingNumber}</span>
                    <span className={`asg-type ${isExpress ? "express" : "simple"}`}>
                      {isExpress ? <><Zap size={11} /> Express</> : t("assign.simple")}
                    </span>
                    {roundBadge(s.pickupRound)}
                    {s.isFragile && <span className="asg-fragile"><AlertTriangle size={11} /> {t("assign.fragile")}</span>}
                  </div>
                  <div className="asg-route">
                    <span><Store size={13} /> {s.storeName}</span>
                    <span className="asg-arrow">→</span>
                    <span><MapPin size={13} /> {s.deliveryAddress ? `${s.deliveryAddress}, ` : ""}{s.deliveryCity}</span>
                  </div>
                </div>

                <div className="asg-price">{s.deliveryPrice != null ? formatEUR(s.deliveryPrice) : "—"}</div>

                <div className="asg-assign">
                  {s.livreur && (
                    <div className="asg-current"><UserCheck size={13} /> {s.livreur.name}</div>
                  )}
                  <div className="asg-assign-controls">
                    <select
                      value={selected}
                      onChange={(e) => setPicked((p) => ({ ...p, [s.id]: e.target.value }))}
                      className="asg-select"
                    >
                      <option value="">{t("assign.choose")}</option>
                      {livreurs?.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}{l.activeJobs > 0 ? ` (${l.activeJobs})` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      className="asg-btn"
                      disabled={!selected || busyId === s.id || (tab === "ASSIGNED" && !changed)}
                      onClick={() => doAssign(s)}
                    >
                      {busyId === s.id ? "..." : s.livreur ? t("assign.reassign") : t("assign.assign")}
                    </button>
                  </div>
                  <button className="asg-cancel" onClick={() => setCancelTarget(s)} disabled={busyId === s.id}>
                    <Ban size={12} /> {tc("cancel.confirm")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CancelShipmentModal
        open={!!cancelTarget}
        target={cancelTarget}
        asAdmin
        onClose={() => setCancelTarget(null)}
        onDone={(msg) => { setBanner({ kind: "ok", msg }); setTimeout(() => setBanner(null), 6000); }}
      />

      {shipments && shipments.length > 0 && (
        <p className="asg-hint"><CalendarClock size={13} /> {t("assign.hint")}</p>
      )}
    </>
  );
}
