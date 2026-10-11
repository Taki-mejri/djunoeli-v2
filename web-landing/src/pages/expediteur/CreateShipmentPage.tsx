import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import {
  User, Phone, MapPin, Home, Zap, Truck, AlertTriangle,
  Wallet, Check, Info, Loader2,
} from "lucide-react";
import { DORTMUND_DISTRICTS } from "../../lib/dortmund";
import { useEstimatePrice, useCreateShipment, type PriceEstimate } from "../../lib/createShipmentQueries";
import { useMyWallet } from "../../lib/walletQueries";
import { formatEUR } from "../../lib/money";
import { dateLocaleTag } from "../../lib/dateLocale";

export default function CreateShipmentPage() {
  const { t, i18n } = useTranslation("expediteur");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();

  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [quartier, setQuartier] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<"SIMPLE" | "EXPRESS">("SIMPLE");
  const [isFragile, setIsFragile] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const estimateMut = useEstimatePrice();
  const createMut = useCreateShipment();
  const { data: wallet } = useMyWallet();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // N° de la dernière demande d'estimation : une réponse plus ancienne qui
  // arriverait en retard est ignorée (sinon le prix affiché ≠ prix débité).
  const estimateSeq = useRef(0);
  // Vrai entre une saisie (quartier/adresse) et la réponse correspondante
  const [estimating, setEstimating] = useState(false);

  // Estimation live (debounce) dès qu'un quartier est choisi
  useEffect(() => {
    const seq = ++estimateSeq.current;
    if (!quartier) { setEstimate(null); setEstimating(false); return; }
    setEstimating(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await estimateMut.mutateAsync({ quartier, address: address.trim() || undefined });
        if (seq === estimateSeq.current) setEstimate(res);
      } catch {
        if (seq === estimateSeq.current) setEstimate(null);
      } finally {
        if (seq === estimateSeq.current) setEstimating(false);
      }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quartier, address]);

  const chosenPrice = estimate ? (type === "SIMPLE" ? estimate.prices.simple : estimate.prices.express) : null;
  const balance = wallet?.balance ?? 0;
  const insufficient = chosenPrice != null && balance < chosenPrice;
  const canSubmit =
    receiverName.trim().length >= 2 &&
    receiverPhone.trim().length >= 5 &&
    quartier &&
    address.trim().length >= 5 &&
    chosenPrice != null &&
    !estimating && // prix à jour avant de payer
    !insufficient &&
    !createMut.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      const res = await createMut.mutateAsync({
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
        deliveryCity: quartier,
        deliveryAddress: address.trim(),
        deliveryType: type,
        isFragile,
        description: description.trim() || undefined,
      });
      navigate("/expediteur/shipments", { state: { created: res.trackingNumber, pickupRound: res.pickupRound } });
    } catch (err) {
      const msg = isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message
        : null;
      setError(msg ?? tc("common.error"));
    }
  };

  return (
    <>
      <div className="ds-page-head">
        <div>
          <h1>{t("create.title")}</h1>
          <p>{t("create.subtitle")}</p>
        </div>
        {wallet && (
          <div className="cs-wallet-chip">
            <Wallet size={15} />
            <span>{t("create.balance")}</span>
            <b>{formatEUR(balance)}</b>
          </div>
        )}
      </div>

      <form className="cs-form" onSubmit={submit}>
        <div className="cs-grid">
          {/* Colonne gauche : infos */}
          <div className="cs-col">
            {/* Destinataire */}
            <div className="cs-card">
              <h3>{t("create.sectionReceiver")}</h3>
              <div className="cs-field">
                <label><User size={14} /> {t("create.receiverName")}</label>
                <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder={t("create.receiverNamePlaceholder")} />
              </div>
              <div className="cs-field">
                <label><Phone size={14} /> {t("create.receiverPhone")}</label>
                <input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} placeholder="+49 ..." />
              </div>
            </div>

            {/* Livraison */}
            <div className="cs-card">
              <h3>{t("create.sectionDelivery")}</h3>
              <div className="cs-field">
                <label><MapPin size={14} /> {t("create.deliveryCity")}</label>
                <select value={quartier} onChange={(e) => setQuartier(e.target.value)}>
                  <option value="">{t("create.selectCity")}</option>
                  {DORTMUND_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="cs-field">
                <label><Home size={14} /> {t("create.deliveryAddress")}</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("create.deliveryAddressPlaceholder")} required />
                <span className="cs-hint">{t("create.addressRequiredHint")}</span>
              </div>
            </div>

            {/* Options */}
            <div className="cs-card">
              <h3>{t("create.sectionOptions")}</h3>
              <label className="cs-check">
                <input type="checkbox" checked={isFragile} onChange={(e) => setIsFragile(e.target.checked)} />
                <span><AlertTriangle size={14} /> {t("create.fragile")} <small>{t("create.fragileHintNoCost")}</small></span>
              </label>
              <div className="cs-field">
                <label>{t("create.description")} <span className="cs-opt">({tc("common.optional")})</span></label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={t("create.descriptionPlaceholder")} maxLength={300} />
              </div>
            </div>
          </div>

          {/* Colonne droite : type + prix */}
          <div className="cs-col">
            <div className="cs-card cs-pricing">
              <h3>{t("create.deliveryType")}</h3>

              {!quartier && <div className="cs-pick-hint"><Info size={15} /> {t("create.pickCityFirst")}</div>}

              {quartier && estimating && !estimate && (
                <div className="cs-estimating"><Loader2 size={16} className="cs-spin" /> {t("create.estimating")}</div>
              )}

              {/* Les 2 options avec prix live */}
              <button type="button" className={`cs-type ${type === "SIMPLE" ? "active" : ""}`} onClick={() => setType("SIMPLE")} disabled={!estimate}>
                <div className="cs-type-ic"><Truck size={20} /></div>
                <div className="cs-type-info">
                  <b>{t("create.simple")}</b>
                  <span>{t("create.simpleDesc")}</span>
                </div>
                <div className="cs-type-price">{estimate ? formatEUR(estimate.prices.simple) : "—"}</div>
              </button>

              <button type="button" className={`cs-type ${type === "EXPRESS" ? "active" : ""}`} onClick={() => setType("EXPRESS")} disabled={!estimate}>
                <div className="cs-type-ic express"><Zap size={20} /></div>
                <div className="cs-type-info">
                  <b>{t("create.express")}</b>
                  <span>{t("create.expressDesc")}</span>
                </div>
                <div className="cs-type-price">{estimate ? formatEUR(estimate.prices.express) : "—"}</div>
              </button>

              {estimate && (
                <div className="cs-distance">
                  <MapPin size={13} /> {t("create.distance", { km: estimate.distanceKm.toLocaleString(dateLocaleTag(i18n.language), { maximumFractionDigits: 1 }) })}
                  {estimate.geocodeSource === "quartier_fallback" && (
                    <span className="cs-approx"> · {t("create.approxDistance")}</span>
                  )}
                </div>
              )}

              {/* Récap débit */}
              {chosenPrice != null && (
                <div className="cs-total">
                  <div className="cs-total-row">
                    <span>{t("create.toPay")}</span>
                    <b>{formatEUR(chosenPrice)}</b>
                  </div>
                  <div className={`cs-total-row sub ${insufficient ? "err" : ""}`}>
                    <span>{t("create.balanceAfter")}</span>
                    <b>{formatEUR(balance - chosenPrice)}</b>
                  </div>
                </div>
              )}

              {insufficient && (
                <div className="cs-insufficient">
                  <AlertTriangle size={15} /> {t("create.insufficient")}
                </div>
              )}

              {error && <div className="cs-error">{error}</div>}

              <button type="submit" className="cs-submit" disabled={!canSubmit}>
                {createMut.isPending
                  ? t("create.submitting")
                  : <><Check size={16} /> {t("create.submit")}</>}
              </button>

              <p className="cs-prepaid-note">{t("create.prepaidNote")}</p>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
