import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import {
  Package, MapPin, User, Truck, Zap, AlertTriangle, Wallet,
  Check, ArrowLeft, ArrowRight,
} from "lucide-react";
import {
  useCreateMyShipment,
  useEstimatePrice,
  type CreateShipmentInput,
  type DeliveryType,
} from "../../lib/shipmentQueries";
import { useMyExpediteurProfile } from "../../lib/expediteurQueries";

/**
 * Les 24 gouvernorats tunisiens — noms propres, JAMAIS traduits.
 */
const TUNISIA_CITIES = [
  "Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", "Zaghouan",
  "Bizerte", "Béja", "Jendouba", "Le Kef", "Siliana", "Sousse",
  "Monastir", "Mahdia", "Sfax", "Kairouan", "Kasserine", "Sidi Bouzid",
  "Gabès", "Médenine", "Tataouine", "Gafsa", "Tozeur", "Kébili",
];

/**
 * Erreur affichée : soit une CLÉ i18n (re-traduite si l'utilisateur change de
 * langue), soit un message brut renvoyé par le backend.
 */
type ServerError = { key: string } | { raw: string };

type FormState = {
  receiverName: string;
  receiverPhone: string;
  receiverEmail: string;
  deliveryAddress: string;
  deliveryCity: string;
  description: string;
  deliveryType: DeliveryType;
  isFragile: boolean;
  codAmount: string;
  usePickupOverride: boolean;
  pickupAddress: string;
  pickupCity: string;
};

const emptyForm: FormState = {
  receiverName: "",
  receiverPhone: "",
  receiverEmail: "",
  deliveryAddress: "",
  deliveryCity: "",
  description: "",
  deliveryType: "STANDARD",
  isFragile: false,
  codAmount: "",
  usePickupOverride: false,
  pickupAddress: "",
  pickupCity: "",
};

export default function CreateShipmentPage() {
  const navigate = useNavigate();
  const { t } = useTranslation("expediteur");
  const { t: tc } = useTranslation("common");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const { data: profile } = useMyExpediteurProfile();
  const create = useCreateMyShipment();

  const { data: estimate } = useEstimatePrice({
    deliveryType: form.deliveryType,
    isFragile: form.isFragile,
  });

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // La validation stocke des CLÉS i18n, jamais des libellés figés
  const validation = useMemo(() => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (form.receiverName.trim().length < 2) errs.receiverName = "create.validation.nameRequired";
    if (!/^\+?[0-9\s-]{7,20}$/.test(form.receiverPhone)) errs.receiverPhone = "create.validation.phoneInvalid";
    if (form.deliveryAddress.trim().length < 5) errs.deliveryAddress = "create.validation.addressTooShort";
    if (!form.deliveryCity) errs.deliveryCity = "create.validation.cityRequired";
    if (form.codAmount && (isNaN(Number(form.codAmount)) || Number(form.codAmount) < 0)) {
      errs.codAmount = "create.validation.codInvalid";
    }
    if (form.usePickupOverride) {
      if (form.pickupAddress.trim().length < 5) errs.pickupAddress = "create.validation.addressTooShort";
      if (!form.pickupCity) errs.pickupCity = "create.validation.cityRequired";
    }
    return errs;
  }, [form]);

  const isValid = Object.keys(validation).length === 0;
  const profileHasPickup = !!profile?.pickupAddress && !!profile?.pickupCity;
  const needsOverride = !profileHasPickup && !form.usePickupOverride;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (needsOverride) {
      setServerError({ key: "create.errors.noPickup" });
      return;
    }

    const payload: CreateShipmentInput = {
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone.trim(),
      receiverEmail: form.receiverEmail.trim() || undefined,
      deliveryAddress: form.deliveryAddress.trim(),
      deliveryCity: form.deliveryCity,
      description: form.description.trim() || undefined,
      deliveryType: form.deliveryType,
      isFragile: form.isFragile,
      codAmount: form.codAmount ? Number(form.codAmount) : 0,
      ...(form.usePickupOverride
        ? {
            pickupAddress: form.pickupAddress.trim(),
            pickupCity: form.pickupCity,
          }
        : {}),
    };

    try {
      const created = await create.mutateAsync(payload);
      navigate(`/expediteur/shipments/${created.id}`);
    } catch (err) {
      if (isAxiosError(err)) {
        const msg = (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
        setServerError(msg ? { raw: msg } : { key: "create.errors.create" });
      } else {
        setServerError({ key: "create.errors.network" });
      }
    }
  };

  return (
    <>
      <div className="ds-page-head">
        <div>
          <button className="auth-back" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> {tc("actions.back")}
          </button>
          <h1>{t("create.title")}</h1>
          <p>{t("create.subtitle")}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="ship-form">
        <div className="ship-grid">
          {/* ===== Colonne gauche : formulaire ===== */}
          <div className="ship-col-form">
            {/* Section Destinataire */}
            <div className="ship-section">
              <div className="ship-section-head">
                <span className="ship-section-ic"><User size={17} /></span>
                <h3>{t("create.sections.receiver")}</h3>
              </div>
              <div className="set-row">
                <div className="set-field">
                  <label>{t("create.fields.fullName")}</label>
                  <input
                    required
                    value={form.receiverName}
                    onChange={(e) => update("receiverName", e.target.value)}
                    placeholder={t("create.placeholders.name")}
                  />
                  {form.receiverName.length > 0 && validation.receiverName && (
                    <span className="auth-err">{t(validation.receiverName)}</span>
                  )}
                </div>
                <div className="set-field">
                  <label>{t("create.fields.phone")}</label>
                  <input
                    required
                    value={form.receiverPhone}
                    onChange={(e) => update("receiverPhone", e.target.value)}
                    placeholder={t("create.placeholders.phone")}
                  />
                  {form.receiverPhone.length > 0 && validation.receiverPhone && (
                    <span className="auth-err">{t(validation.receiverPhone)}</span>
                  )}
                </div>
              </div>
              <div className="set-field">
                <label>{t("create.fields.email")}</label>
                <input
                  type="email"
                  value={form.receiverEmail}
                  onChange={(e) => update("receiverEmail", e.target.value)}
                  placeholder={t("create.placeholders.email")}
                />
              </div>
            </div>

            {/* Section Adresse de livraison */}
            <div className="ship-section">
              <div className="ship-section-head">
                <span className="ship-section-ic"><MapPin size={17} /></span>
                <h3>{t("create.sections.address")}</h3>
              </div>
              <div className="set-field">
                <label>{t("create.fields.fullAddress")}</label>
                <input
                  required
                  value={form.deliveryAddress}
                  onChange={(e) => update("deliveryAddress", e.target.value)}
                  placeholder={t("create.placeholders.address")}
                />
                {form.deliveryAddress.length > 0 && validation.deliveryAddress && (
                  <span className="auth-err">{t(validation.deliveryAddress)}</span>
                )}
              </div>
              <div className="set-field">
                <label>{t("create.fields.city")}</label>
                <select
                  className="tbl-select"
                  style={{ width: "100%" }}
                  required
                  value={form.deliveryCity}
                  onChange={(e) => update("deliveryCity", e.target.value)}
                >
                  <option value="">{t("create.placeholders.chooseCity")}</option>
                  {/* Gouvernorats : noms propres, non traduits */}
                  {TUNISIA_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section Type de livraison */}
            <div className="ship-section">
              <div className="ship-section-head">
                <span className="ship-section-ic"><Truck size={17} /></span>
                <h3>{t("create.sections.deliveryType")}</h3>
              </div>
              <div className="ship-types">
                <label className={`ship-type-card ${form.deliveryType === "STANDARD" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="deliveryType"
                    checked={form.deliveryType === "STANDARD"}
                    onChange={() => update("deliveryType", "STANDARD")}
                  />
                  <div className="stc-head">
                    <Truck size={18} />
                    <span className="stc-name">{t("create.standard.name")}</span>
                  </div>
                  <p className="stc-desc">{t("create.standard.desc")}</p>
                  <span className="stc-price">8 DT</span>
                </label>
                <label className={`ship-type-card ${form.deliveryType === "EXPRESS" ? "selected express" : ""}`}>
                  <input
                    type="radio"
                    name="deliveryType"
                    checked={form.deliveryType === "EXPRESS"}
                    onChange={() => update("deliveryType", "EXPRESS")}
                  />
                  <div className="stc-head">
                    <Zap size={18} />
                    <span className="stc-name">{t("create.express.name")}</span>
                  </div>
                  <p className="stc-desc">{t("create.express.desc")}</p>
                  <span className="stc-price">12 DT</span>
                </label>
              </div>

              <label className="ship-fragile">
                <input
                  type="checkbox"
                  checked={form.isFragile}
                  onChange={(e) => update("isFragile", e.target.checked)}
                />
                <AlertTriangle size={16} />
                <div>
                  <b>{t("create.fragile.title")}</b>
                  <span>{t("create.fragile.desc")}</span>
                </div>
              </label>
            </div>

            {/* Section COD */}
            <div className="ship-section">
              <div className="ship-section-head">
                <span className="ship-section-ic"><Wallet size={17} /></span>
                <h3>{t("create.sections.cod")}</h3>
              </div>
              <div className="set-field">
                <label>{t("create.fields.codAmount")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.codAmount}
                  onChange={(e) => update("codAmount", e.target.value)}
                  placeholder={t("create.placeholders.codAmount")}
                />
                {validation.codAmount && (
                  <span className="auth-err">{t(validation.codAmount)}</span>
                )}
              </div>
            </div>

            {/* Section Description */}
            <div className="ship-section">
              <div className="ship-section-head">
                <span className="ship-section-ic"><Package size={17} /></span>
                <h3>{t("create.sections.description")}</h3>
              </div>
              <div className="set-field">
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder={t("create.placeholders.description")}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>

            {/* Section Ramassage (avancé) */}
            <div className="ship-section">
              <label className="ship-toggle-row">
                <input
                  type="checkbox"
                  checked={form.usePickupOverride}
                  onChange={(e) => update("usePickupOverride", e.target.checked)}
                />
                <div>
                  <b>{t("create.pickup.toggleTitle")}</b>
                  <span>
                    {profileHasPickup
                      ? t("create.pickup.default", { address: profile.pickupAddress, city: profile.pickupCity })
                      : t("create.pickup.none")}
                  </span>
                </div>
              </label>

              {form.usePickupOverride && (
                <div style={{ marginTop: 12 }}>
                  <div className="set-field">
                    <label>{t("create.pickup.address")}</label>
                    <input
                      value={form.pickupAddress}
                      onChange={(e) => update("pickupAddress", e.target.value)}
                      placeholder={t("create.pickup.addressPlaceholder")}
                    />
                    {form.pickupAddress.length > 0 && validation.pickupAddress && (
                      <span className="auth-err">{t(validation.pickupAddress)}</span>
                    )}
                  </div>
                  <div className="set-field">
                    <label>{t("create.pickup.city")}</label>
                    <select
                      className="tbl-select"
                      style={{ width: "100%" }}
                      value={form.pickupCity}
                      onChange={(e) => update("pickupCity", e.target.value)}
                    >
                      <option value="">{t("create.placeholders.chooseCity")}</option>
                      {TUNISIA_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== Colonne droite : récap & prix ===== */}
          <aside className="ship-col-summary">
            <div className="ship-summary">
              <h3>{t("create.summary.title")}</h3>

              <div className="ship-sum-row">
                <span>{t("create.summary.type")}</span>
                <b>{form.deliveryType === "EXPRESS" ? t("create.express.name") : t("create.standard.name")}</b>
              </div>
              <div className="ship-sum-row">
                <span>{t("create.summary.base")}</span>
                <b>{estimate?.basePrice ?? (form.deliveryType === "EXPRESS" ? 12 : 8)} DT</b>
              </div>
              {form.isFragile && (
                <div className="ship-sum-row">
                  <span>{t("create.summary.fragileFee")}</span>
                  <b>+{estimate?.fragileFee ?? 3} DT</b>
                </div>
              )}

              <div className="ship-sum-divider" />

              <div className="ship-sum-total">
                <span>{t("create.summary.total")}</span>
                <b>{estimate?.total ?? (form.deliveryType === "EXPRESS" ? 12 : 8)} DT</b>
              </div>

              {Number(form.codAmount) > 0 && (
                <div className="ship-cod-info">
                  <Wallet size={14} />
                  <div>
                    <b>{Number(form.codAmount).toFixed(0)} DT</b>
                    <span>{t("create.summary.codNote")}</span>
                  </div>
                </div>
              )}

              {serverError && (
                <div className="auth-server-err" style={{ marginTop: 14 }}>
                  {"key" in serverError ? t(serverError.key) : serverError.raw}
                </div>
              )}

              <button
                type="submit"
                className="ship-submit"
                disabled={!isValid || create.isPending}
              >
                {create.isPending ? (
                  t("create.submitting")
                ) : (
                  <>
                    {t("create.submit")} <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="ship-fineprint">
                <Check size={12} /> {t("create.fineprint")}
              </p>
            </div>
          </aside>
        </div>
      </form>
    </>
  );
}
