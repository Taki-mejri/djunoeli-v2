import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import {
  Search, Package, MapPin, Zap, AlertTriangle, CheckCircle2,
  Circle, Truck, XCircle, RotateCcw, PackageCheck,
} from "lucide-react";
import { usePublicTracking } from "../../lib/publicTrackQueries";
import PhoneTrackPanel from "./PhoneTrackPanel";

const STEP_ICONS: Record<string, typeof Package> = {
  CREATED: Package,
  PICKED_UP: PackageCheck,
  AT_WAREHOUSE: Package,
  IN_TRANSIT: Truck,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle2,
};

export default function PublicTrackPage() {
  const { t } = useTranslation("track");
  const { t: tc } = useTranslation("common");
  const params = useParams<{ trackingNumber?: string }>();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"code" | "phone">("code");
  const [input, setInput] = useState(params.trackingNumber ?? "");
  const [submitted, setSubmitted] = useState(params.trackingNumber ?? "");

  // Si l'URL contient un code (/track/TRK-...), on lance direct
  useEffect(() => {
    if (params.trackingNumber) {
      setInput(params.trackingNumber);
      setSubmitted(params.trackingNumber);
      setTab("code"); // arrivee via /track/TRK-... → toujours l'onglet code
    }
  }, [params.trackingNumber]);

  const { data, isLoading, isError, error } = usePublicTracking(submitted, !!submitted);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const code = input.trim();
    if (code.length < 3) return;
    setSubmitted(code);
    navigate(`/track/${encodeURIComponent(code)}`);
  };

  const notFound =
    isError && isAxiosError(error) && error.response?.status === 404;

  return (
    <div className="trk-page">
      <div className="trk-hero">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>

        {/* Onglets : par numero de suivi / par telephone */}
        <div className="trk-tabs">
          <button
            type="button"
            className={`trk-tab ${tab === "code" ? "active" : ""}`}
            onClick={() => setTab("code")}
          >
            {t("tabs.byCode")}
          </button>
          <button
            type="button"
            className={`trk-tab ${tab === "phone" ? "active" : ""}`}
            onClick={() => setTab("phone")}
          >
            {t("tabs.byPhone")}
          </button>
        </div>

        {tab === "code" && (
          <form className="trk-search" onSubmit={onSearch}>
            <Search size={18} />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("placeholder")}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" disabled={input.trim().length < 3}>
              {t("trackBtn")}
            </button>
          </form>
        )}
      </div>

      {/* ----- Onglet CODE : resultats du suivi par numero ----- */}
      {tab === "code" && (
        <>
          {isLoading && <div className="trk-loading">{tc("actions.loading")}</div>}

          {notFound && (
            <div className="trk-notfound">
              <XCircle size={40} strokeWidth={1.4} />
              <h3>{t("notFoundTitle")}</h3>
              <p>{t("notFoundHint", { code: submitted })}</p>
            </div>
          )}

          {isError && !notFound && (
            <div className="trk-notfound">
              <AlertTriangle size={40} strokeWidth={1.4} />
              <h3>{t("errorTitle")}</h3>
              <p>{t("errorHint")}</p>
            </div>
          )}

          {data && (
            <div className="trk-result">
              {/* En-tête résultat */}
              <div className="trk-card-head">
                <div>
                  <span className="trk-label">{t("trackingNumber")}</span>
                  <span className="mono-cell trk-code">{data.trackingNumber}</span>
                </div>
                <span className={`trk-badge trk-badge-${data.special ? "special" : "ok"}`}>
                  {data.special
                    ? t(`special.${data.special}`)
                    : tc(`status.${data.status}`)}
                </span>
              </div>

              {/* Infos colis (non personnelles) */}
              <div className="trk-info">
                <div className="trk-info-item">
                  <MapPin size={15} />
                  <span>{t("destination")}</span>
                  <b>{data.destinationCity}</b>
                </div>
                <div className="trk-info-item">
                  {data.deliveryType === "EXPRESS" ? <Zap size={15} /> : <Package size={15} />}
                  <span>{t("type")}</span>
                  <b>{data.deliveryType === "EXPRESS" ? t("express") : t("standard")}</b>
                </div>
                {data.isFragile && (
                  <div className="trk-info-item">
                    <AlertTriangle size={15} />
                    <span>{t("handling")}</span>
                    <b>{t("fragile")}</b>
                  </div>
                )}
              </div>

              {/* État spécial (échec / annulé / retourné) */}
              {data.special && (
                <div className={`trk-special trk-special-${data.special.toLowerCase()}`}>
                  {data.special === "FAILED" && <AlertTriangle size={18} />}
                  {data.special === "CANCELLED" && <XCircle size={18} />}
                  {data.special === "RETURNED" && <RotateCcw size={18} />}
                  <span>{t(`specialHint.${data.special}`)}</span>
                </div>
              )}

              {/* Timeline verticale */}
              {!data.special && (
                <div className="trk-timeline">
                  {data.steps.map((step) => {
                    const Icon = STEP_ICONS[step.key] ?? Circle;
                    return (
                      <div
                        key={step.key}
                        className={`trk-step ${step.reached ? "reached" : ""} ${step.current ? "current" : ""}`}
                      >
                        <div className="trk-step-dot">
                          <Icon size={16} />
                        </div>
                        <div className="trk-step-body">
                          <span className="trk-step-label">{t(`steps.${step.key}`)}</span>
                          {step.at && (
                            <span className="trk-step-date">
                              {new Date(step.at).toLocaleString(undefined, {
                                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="trk-footer-note">{t("privacyNote")}</p>
            </div>
          )}
        </>
      )}

      {/* ----- Onglet TELEPHONE : OTP ----- */}
      {tab === "phone" && <PhoneTrackPanel />}
    </div>
  );
}
