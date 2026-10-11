import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, PackagePlus, ArrowDownWideNarrow, TruckElectric, MapPin } from "lucide-react";
import { useScanHistory } from "../../lib/dispatcherQueries";
import { dateLocaleTag } from "../../lib/dateLocale";
import { serverNoteKey } from "../../lib/serverNotes";

type Filter = "ALL" | "RECEIVE" | "SORT" | "ASSIGN";

/** Onglets de filtre : on ne stocke que des clés i18n, traduites au rendu */
const FILTER_TABS: { key: Filter; labelKey: string }[] = [
  { key: "ALL", labelKey: "history.tabs.all" },
  { key: "RECEIVE", labelKey: "history.tabs.receive" },
  { key: "SORT", labelKey: "history.tabs.sort" },
  { key: "ASSIGN", labelKey: "history.tabs.assign" },
];

/**
 * Choix de l'icône à partir de la note du backend (stockée en français en base
 * et interrogée par son contenu côté serveur) : c'est de la logique interne,
 * pas de l'affichage — rien à traduire ici.
 */
function eventVisual(note: string | null, status: string) {
  if (status === "PICKED_UP") return { icon: <TruckElectric size={16} />, cls: "assign" };
  if (note?.includes("Trié")) return { icon: <ArrowDownWideNarrow size={16} />, cls: "sort" };
  if (note?.includes("Reçu")) return { icon: <PackagePlus size={16} />, cls: "recv" };
  return { icon: <PackagePlus size={16} />, cls: "recv" };
}

export default function ScanHistoryPage() {
  const { t, i18n } = useTranslation("dispatch");
  const { t: tc } = useTranslation("common");
  const locale = dateLocaleTag(i18n.language);
  const [filter, setFilter] = useState<Filter>("ALL");
  const { data, isLoading, isError, error } = useScanHistory(
    filter === "ALL" ? undefined : filter
  );

  /** Note système connue → traduite ; note dynamique (dépôt, bac, raison) → brute */
  const noteText = (note: string | null) => {
    if (!note) return note;
    const key = serverNoteKey(note);
    return key ? tc(key) : note;
  };

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("history.title")}</h1>
          <p>{t("history.subtitle")}</p>
        </div>
      </div>

      <div className="dsp-tabs">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`dsp-tab ${filter === tab.key ? "active" : ""}`}
            onClick={() => setFilter(tab.key)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {isError && (
        <div className="api-err">
          <AlertCircle size={18} />
          {(error as Error)?.message ?? t("errors.load")}
        </div>
      )}

      {isLoading ? (
        <div className="api-loading">{tc("actions.loading")}</div>
      ) : data && data.entries.length === 0 ? (
        <div className="empty-state">
          <PackagePlus size={48} strokeWidth={1.4} />
          <h3>{t("history.empty")}</h3>
          <p>{t("history.emptyHint")}</p>
        </div>
      ) : (
        <div className="dsp-history">
          {data?.entries.map((e) => {
            const v = eventVisual(e.note, e.status);
            return (
              <div className="dsp-hist-row" key={e.id}>
                <div className={`dsp-hist-ic ${v.cls}`}>{v.icon}</div>
                <div className="dsp-hist-main">
                  <div className="dsp-hist-top">
                    <span className="mono-cell">{e.shipment.trackingNumber}</span>
                    <span className="dsp-hist-note">{noteText(e.note)}</span>
                  </div>
                  <div className="dsp-hist-sub">
                    {/* Gouvernorats : non traduits */}
                    <span>{e.shipment.receiverName} · {e.shipment.deliveryCity}</span>
                    {e.location && (
                      <span className="dsp-hist-loc">
                        <MapPin size={11} /> {e.location}
                      </span>
                    )}
                  </div>
                </div>
                <span className="dsp-hist-time">
                  {new Date(e.createdAt).toLocaleString(locale, {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
