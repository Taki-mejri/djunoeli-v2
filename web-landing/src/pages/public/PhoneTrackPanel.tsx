import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import {
  Phone, ShieldCheck, ArrowLeft, Package, MapPin, Zap,
  AlertTriangle, ChevronRight, RotateCcw,
} from "lucide-react";
import { useRequestOtp, useVerifyOtp, type PhoneShipment } from "../../lib/otpQueries";

/**
 * Suivi par téléphone + OTP. Composant autonome, monté dans l'onglet
 * "Par téléphone" de la page de suivi public.
 */
export default function PhoneTrackPanel() {
  const { t } = useTranslation("track");
  const { t: tc } = useTranslation("common");

  const [step, setStep] = useState<"phone" | "code" | "result">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [shipments, setShipments] = useState<PhoneShipment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const errMsg = (e: unknown) =>
    isAxiosError(e)
      ? (e.response?.data as { error?: { message?: string } } | undefined)?.error?.message ?? t("errorHint")
      : t("errorHint");

  const submitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setHint(null);
    if (phone.trim().length < 6) return;
    try {
      const res = await requestOtp.mutateAsync(phone.trim());
      setStep("code");
      // En simulation, on indique où trouver le code (dev only).
      if (res.simulated) setHint(t("otp.simulatedHint"));
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) return;
    try {
      const res = await verifyOtp.mutateAsync({ phone: phone.trim(), code: code.trim() });
      setShipments(res.shipments);
      setStep("result");
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const resend = async () => {
    setError(null); setHint(null); setCode("");
    try {
      const res = await requestOtp.mutateAsync(phone.trim());
      if (res.simulated) setHint(t("otp.simulatedHint"));
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const reset = () => {
    setStep("phone"); setPhone(""); setCode(""); setShipments([]); setError(null); setHint(null);
  };

  /* ---------- Étape 1 : téléphone ---------- */
  if (step === "phone") {
    return (
      <form className="otp-panel" onSubmit={submitPhone}>
        <div className="otp-ic"><Phone size={22} /></div>
        <h3>{t("otp.phoneTitle")}</h3>
        <p>{t("otp.phoneSubtitle")}</p>
        <div className="otp-field">
          <Phone size={16} />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("otp.phonePlaceholder")}
            autoComplete="tel"
          />
        </div>
        {error && <div className="otp-error">{error}</div>}
        <button className="otp-btn" type="submit" disabled={requestOtp.isPending || phone.trim().length < 6}>
          {requestOtp.isPending ? t("otp.sending") : t("otp.sendCode")}
        </button>
        <p className="otp-note">{t("otp.privacyNote")}</p>
      </form>
    );
  }

  /* ---------- Étape 2 : code ---------- */
  if (step === "code") {
    return (
      <form className="otp-panel" onSubmit={submitCode}>
        <button type="button" className="otp-back" onClick={() => setStep("phone")}>
          <ArrowLeft size={15} /> {tc("actions.back")}
        </button>
        <div className="otp-ic"><ShieldCheck size={22} /></div>
        <h3>{t("otp.codeTitle")}</h3>
        <p>{t("otp.codeSubtitle", { phone: phone.trim() })}</p>
        {hint && <div className="otp-hint">{hint}</div>}
        <div className="otp-field otp-field-code">
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            autoFocus
          />
        </div>
        {error && <div className="otp-error">{error}</div>}
        <button className="otp-btn" type="submit" disabled={verifyOtp.isPending || !/^\d{6}$/.test(code)}>
          {verifyOtp.isPending ? t("otp.verifying") : t("otp.verify")}
        </button>
        <button type="button" className="otp-resend" onClick={resend} disabled={requestOtp.isPending}>
          {t("otp.resend")}
        </button>
      </form>
    );
  }

  /* ---------- Étape 3 : résultats ---------- */
  return (
    <div className="otp-results">
      <div className="otp-results-head">
        <div>
          <h3>{t("otp.resultTitle")}</h3>
          <p>{t("otp.resultCount", { count: shipments.length })}</p>
        </div>
        <button className="otp-back-btn" onClick={reset}>
          <RotateCcw size={14} /> {t("otp.otherNumber")}
        </button>
      </div>

      {shipments.length === 0 ? (
        <div className="otp-empty">
          <Package size={40} strokeWidth={1.4} />
          <p>{t("otp.noShipments")}</p>
        </div>
      ) : (
        <div className="otp-list">
          {shipments.map((s) => (
            <Link key={s.trackingNumber} to={`/track/${encodeURIComponent(s.trackingNumber)}`} className="otp-ship">
              <div className="otp-ship-main">
                <span className="mono-cell otp-ship-trk">{s.trackingNumber}</span>
                <span className="otp-ship-status">{tc(`status.${s.status}`)}</span>
              </div>
              <div className="otp-ship-sub">
                <MapPin size={12} /> {s.destinationCity}
                {s.deliveryType === "EXPRESS" && <span className="otp-tag"><Zap size={11} /> {t("express")}</span>}
                {s.isFragile && <span className="otp-tag frag"><AlertTriangle size={11} /> {t("fragile")}</span>}
              </div>
              <ChevronRight size={18} className="otp-ship-arrow" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
